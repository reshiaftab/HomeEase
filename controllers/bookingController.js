import Booking from "../models/Booking.js";
import ProviderAvailability from "../models/ProviderAvailability.js";
import Service from "../models/Service.js";
import User from "../models/User.js";
import { Op } from "sequelize";
import { createNotification } from "./notificationController.js";

// ==================================================
// Get Admin User
// ==================================================
const getAdmin = async () => {
    return await User.findOne({
        where: {
            role: "admin"
        }
    });
};

// ==================================================
// Create Booking
// Resident sends provider_id
// Backend automatically finds provider's service
// ==================================================
export const createBooking = async (req, res) => {
    try {
        const residentId = req.user.id;
        const {
            provider_id,
            booking_date,
            booking_time,
            latitude,
            longitude,
            service_address,
            additional_notes
        } = req.body;

        if (!provider_id || !booking_date || !booking_time || latitude == null || longitude == null || !service_address) {
            return res.status(400).json({
                message: "provider_id, booking_date, booking_time, latitude, longitude, and service_address are required"
            });
        }

        if (typeof service_address !== "string" || service_address.trim().length < 5) {
            return res.status(400).json({
                message: "Service address must be at least 5 characters long"
            });
        }

        const provider = await User.findOne({
            where: {
                user_id: provider_id,
                role: "provider",
                approval_status: "approved"
            }
        });

        if (!provider) {
            return res.status(404).json({
                message: "Approved provider not found"
            });
        }

        const service = await Service.findOne({
            where: {
                provider_id: provider.user_id
            }
        });

        if (!service) {
            return res.status(404).json({
                message: "No service found for this provider"
            });
        }

        const dayOfWeek = new Date(booking_date).toLocaleString("en-US", {
            weekday: "short"
        });

        const availableSlot = await ProviderAvailability.findOne({
            where: {
                provider_id: provider.user_id,
                day_of_week: dayOfWeek,
                start_time: {
                    [Op.lte]: booking_time
                },
                end_time: {
                    [Op.gte]: booking_time
                }
            }
        });

        if (!availableSlot) {
            return res.status(400).json({
                message: "Provider is not available at this time"
            });
        }

        // Enforce 30-minute slot boundaries: booking_time must fall on a
        // half-hour mark (HH:00 or HH:30) within the working window.
        const bookingMinutes = (() => {
            const parts = String(booking_time).split(":");
            const h = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            if (isNaN(h) || isNaN(m)) return null;
            return h * 60 + m;
        })();

        if (bookingMinutes === null || bookingMinutes % 30 !== 0) {
            return res.status(400).json({
                message: "Please choose a 30-minute time slot from the provider's availability."
            });
        }

        // Reject bookings in the past. Compare dates as local yyyy-mm-dd to
        // avoid timezone shifts, and block earlier 30-min slots on today.
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        if (booking_date < todayStr) {
            return res.status(400).json({
                message: "You cannot book a date in the past."
            });
        }
        if (booking_date === todayStr) {
            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            // Slot starts on a half-hour mark; allow only if it hasn't begun.
            if (bookingMinutes < nowMinutes) {
                return res.status(400).json({
                    message: "This time slot has already passed. Please choose a later slot."
                });
            }
        }

        const existingBooking = await Booking.findOne({
            where: {
                provider_id: provider.user_id,
                booking_date,
                booking_time,
                status: {
                    [Op.in]: ["pending", "accepted"]
                }
            }
        });

        if (existingBooking) {
            return res.status(400).json({
                message: "This time slot is already booked"
            });
        }

        const newBooking = await Booking.create({
            resident_id: residentId,
            service_id: service.service_id,
            provider_id: provider.user_id,
            booking_date,
            booking_time,
            latitude,
            longitude,
            service_address: service_address.trim(),
            additional_notes: additional_notes
                ? additional_notes.trim()
                : "",
            status: "pending"
        });

        await createNotification(
            provider.user_id,
            "booking",
            `New booking request for ${booking_date} at ${booking_time}`
        );

        await createNotification(
            residentId,
            "booking",
            `Your booking request for ${booking_date} at ${booking_time} has been sent to the provider.`
        );

        const admin = await getAdmin();

        if (admin) {
            await createNotification(
                admin.user_id,
                "booking",
                `New booking request created for ${booking_date} at ${booking_time}.`
            );
        }

        const bookingDetails = await Booking.findByPk(
            newBooking.booking_id,
            {
                include: [
                    {
                        model: Service,
                        attributes: [
                            "service_id",
                            "title",
                            "price"
                        ]
                    },
                    {
                        model: User,
                        as: "provider",
                        attributes: [
                            "user_id",
                            "name",
                            "email",
                            "phone",
                            "service_category",
                            "provider_address",
                            "profile_picture"
                        ]
                    },
                    {
                        model: User,
                        as: "resident",
                        attributes: [
                            "user_id",
                            "name",
                            "email",
                            "phone",
                            "profile_picture"
                        ]
                    }
                ]
            }
        );

        res.status(201).json({
            success: true,
            message: "Booking created successfully",
            booking: bookingDetails
        });
    } catch (error) {
        console.error("Create booking error:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ==================================================
// View My Bookings
// Resident:
// Gets bookings created by logged-in resident
//
// Provider:
// Gets bookings assigned to logged-in provider
// ==================================================
export const getMyBookings = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        let bookings;

        // ------------------------------------------
        // Resident bookings
        // ------------------------------------------
        if (role === "resident") {
            bookings = await Booking.findAll({
                where: {
                    resident_id: userId
                },
                include: [
                    {
                        model: Service,
                        attributes: [
                            "service_id",
                            "title",
                            "price"
                        ]
                    },
                    {
                        model: User,
                        as: "provider",
                        attributes: [
                            "user_id",
                            "name",
                            "email",
                            "phone",
                            "service_category",
                            "provider_address",
                            "profile_picture"
                        ]
                    }
                ],
                order: [
                    ["booking_date", "DESC"],
                    ["booking_time", "DESC"]
                ]
            });
        }

        // ------------------------------------------
        // Provider bookings
        // ------------------------------------------
        else if (role === "provider") {
            bookings = await Booking.findAll({
                where: {
                    provider_id: userId
                },
                include: [
                    {
                        model: Service,
                        attributes: [
                            "service_id",
                            "title",
                            "price"
                        ]
                    },
                    {
                        model: User,
                        as: "resident",
                        attributes: [
                            "user_id",
                            "name",
                            "email",
                            "phone",
                            "profile_picture"
                        ]
                    }
                ],
                order: [
                    ["booking_date", "DESC"],
                    ["booking_time", "DESC"]
                ]
            });
        }

        // ------------------------------------------
        // Invalid role
        // ------------------------------------------
        else {
            return res.status(403).json({
                message: "Invalid role"
            });
        }

        res.status(200).json({
            success: true,
            bookings
        });
    } catch (error) {
        console.error("Get bookings error:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ==================================================
// Update Booking Status
//
// Provider can:
// - accept
// - reject
// - complete
// - pending
//
// Sends notifications to:
// - Resident
// - Admin
// ==================================================
export const updateBookingStatus = async (req, res) => {
    try {
        const providerId = req.user.id;
        const { bookingId } = req.params;
        const { status } = req.body;

        const validStatus = [
            "pending",
            "accepted",
            "completed",
            "rejected"
        ];

        if (!validStatus.includes(status)) {
            return res.status(400).json({
                message: "Invalid status value"
            });
        }

        const booking = await Booking.findByPk(bookingId);

        if (!booking || booking.provider_id !== providerId) {
            return res.status(404).json({
                message: "Booking not found or not authorized"
            });
        }

        booking.status = status;
        await booking.save();

        await createNotification(
            booking.resident_id,
            "booking",
            `Your booking status has been updated to "${status}" by the provider.`
        );

        const admin = await getAdmin();

        if (admin) {
            let message;

            if (status === "accepted") {
                message = `Booking #${booking.booking_id} has been accepted by provider.`;
            } else if (status === "completed") {
                message = `Booking #${booking.booking_id} has been completed.`;
            } else if (status === "rejected") {
                message = `Booking #${booking.booking_id} has been rejected by provider.`;
            } else {
                message = `Booking #${booking.booking_id} status changed to ${status}.`;
            }

            await createNotification(
                admin.user_id,
                "booking",
                message
            );
        }

        res.status(200).json({
            success: true,
            message: "Booking status updated successfully",
            booking: {
                booking_id: booking.booking_id,
                status: booking.status
            }
        });
    } catch (error) {
        console.error("Update booking status error:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
// ==================================================
// Start the job timer (provider only)
// Booking must be "accepted". Stamps started_at so we can bill by the hour.
// ==================================================
export const startJob = async (req, res) => {
    try {
        const providerId = req.user.id;
        const { bookingId } = req.params;

        const booking = await Booking.findByPk(bookingId);
        if (!booking || booking.provider_id !== providerId) {
            return res.status(404).json({ success: false, message: "Booking not found or not authorized" });
        }

        if (booking.status !== "accepted") {
            return res.status(400).json({
                success: false,
                message: `A ${booking.status} booking cannot be started. Accept the booking first.`
            });
        }

        if (!booking.started_at) {
            booking.started_at = new Date();
            await booking.save();
        }

        res.status(200).json({
            success: true,
            message: "Timer started",
            booking: {
                booking_id: booking.booking_id,
                status: booking.status,
                started_at: booking.started_at
            }
        });
    } catch (error) {
        console.error("Start job error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ==================================================
// Complete the job (provider only)
// Booking must be "accepted" AND have a started timer. Computes the elapsed
// work time and the final bill from the provider's hourly rate.
// ==================================================
export const completeJob = async (req, res) => {
    try {
        const providerId = req.user.id;
        const { bookingId } = req.params;

        const booking = await Booking.findByPk(bookingId);
        if (!booking || booking.provider_id !== providerId) {
            return res.status(404).json({ success: false, message: "Booking not found or not authorized" });
        }

        if (booking.status !== "accepted") {
            return res.status(400).json({
                success: false,
                message: `A ${booking.status} booking cannot be completed.`
            });
        }

        if (!booking.started_at) {
            return res.status(400).json({
                success: false,
                message: "Start the timer before marking the job as complete."
            });
        }

        // Elapsed work time in seconds.
        let seconds = Math.floor((Date.now() - new Date(booking.started_at).getTime()) / 1000);
        if (seconds < 0) seconds = 0;

        // Hourly rate from the provider's service.
        const service = await Service.findOne({ where: { provider_id: providerId } });
        const rate = service && !isNaN(Number(service.price)) ? Number(service.price) : 0;

        // Bill in whole hours: any partial hour counts as a full hour
        // (e.g. 1h10m -> 2 hours). Minimum 1 hour once work has started.
        const billableHours = Math.max(1, Math.ceil(seconds / 3600));
        const finalAmount = Math.round(billableHours * rate);

        booking.status = "completed";
        booking.work_duration_seconds = seconds;
        booking.final_amount = finalAmount;
        await booking.save();

        await createNotification(
            booking.resident_id,
            "booking",
            `Your job has been completed. Work time: ${formatDuration(seconds)} · Total: PKR ${finalAmount}.`
        );

        // Notify the provider too (the one who marked it complete).
        await createNotification(
            booking.provider_id,
            "booking",
            `You completed booking #${booking.booking_id}. Work time: ${formatDuration(seconds)} · Billed PKR ${finalAmount}.`
        );

        const admin = await getAdmin();
        if (admin) {
            await createNotification(
                admin.user_id,
                "booking",
                `Booking #${booking.booking_id} completed. Billed PKR ${finalAmount} (${formatDuration(seconds)}).`
            );
        }

        res.status(200).json({
            success: true,
            message: "Job completed",
            booking: {
                booking_id: booking.booking_id,
                status: booking.status,
                started_at: booking.started_at,
                work_duration_seconds: booking.work_duration_seconds,
                final_amount: booking.final_amount,
                billable_hours: billableHours
            }
        });
    } catch (error) {
        console.error("Complete job error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Human-readable duration, e.g. "1h 10m" / "45m".
function formatDuration(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

// Cancel a booking (resident only). Allowed while the booking is still
// pending or accepted (not yet completed/rejected/cancelled).
export const cancelBooking = async (req, res) => {
    try {
        const residentId = req.user.id;
        const { bookingId } = req.params;

        const booking = await Booking.findByPk(bookingId);

        if (!booking || booking.resident_id !== residentId) {
            return res.status(404).json({
                success: false,
                message: "Booking not found or not authorized"
            });
        }

        if (!["pending", "accepted"].includes(booking.status)) {
            return res.status(400).json({
                success: false,
                message: `A ${booking.status} booking cannot be cancelled`
            });
        }

        booking.status = "cancelled";
        await booking.save();

        // Confirm to the resident who cancelled.
        await createNotification(
            booking.resident_id,
            "booking",
            `Your booking #${booking.booking_id} has been cancelled.`
        );

        // Notify the provider that the resident cancelled.
        await createNotification(
            booking.provider_id,
            "booking",
            `Booking #${booking.booking_id} has been cancelled by the resident.`
        );

        const admin = await getAdmin();
        if (admin) {
            await createNotification(
                admin.user_id,
                "booking",
                `Booking #${booking.booking_id} was cancelled by the resident.`
            );
        }

        res.status(200).json({
            success: true,
            message: "Booking cancelled successfully",
            booking: {
                booking_id: booking.booking_id,
                status: booking.status
            }
        });
    } catch (error) {
        console.error("Cancel booking error:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
