import Booking from "../models/Booking.js";
import ProviderAvailability from "../models/ProviderAvailability.js";
import Service from "../models/Service.js";
import User from "../models/User.js";
import { Op } from "sequelize";
import { createNotification } from "./notificationController.js";
import { emitBookingUpdate } from "../socket.js";

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

        const residentUser = await User.findByPk(residentId, { attributes: ["name"] });
        const residentName = residentUser?.name || "A resident";
        const providerName = provider.name || "your provider";

        await createNotification(
            provider.user_id,
            "booking",
            `New booking request from ${residentName} for ${booking_date} at ${booking_time}`
        );

        await createNotification(
            residentId,
            "booking",
            `Your booking request with ${providerName} for ${booking_date} at ${booking_time} has been sent.`
        );

        const admin = await getAdmin();

        if (admin) {
            await createNotification(
                admin.user_id,
                "booking",
                `New booking request from ${residentName} to ${providerName} for ${booking_date} at ${booking_time}.`
            );
        }

        // Real-time: tell the provider's app a new incoming request arrived
        // and let the resident refresh their own list.
        emitBookingUpdate({
            bookingId: newBooking.booking_id,
            status: "pending",
            action: "new_booking",
            providerId: newBooking.provider_id,
            residentId: newBooking.resident_id
        });

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

        // Resolve names so notifications address people, not booking numbers.
        const [residentUser, providerUser] = await Promise.all([
            User.findByPk(booking.resident_id, { attributes: ["name"] }),
            User.findByPk(booking.provider_id, { attributes: ["name"] })
        ]);
        const residentName = residentUser?.name || "the resident";
        const providerName = providerUser?.name || "the provider";

        if (status === "accepted") {
            await createNotification(
                booking.resident_id,
                "booking",
                `${providerName} accepted your booking. They will start the job at the scheduled time.`
            );
        } else if (status === "rejected") {
            await createNotification(
                booking.resident_id,
                "booking",
                `${providerName} was unable to accept your booking.`
            );
        } else {
            await createNotification(
                booking.resident_id,
                "booking",
                `Your booking status has been updated to "${status}" by ${providerName}.`
            );
        }

        const admin = await getAdmin();

        if (admin) {
            let message;

            if (status === "accepted") {
                message = `${providerName} accepted a booking from ${residentName}.`;
            } else if (status === "completed") {
                message = `${providerName}'s booking with ${residentName} has been completed.`;
            } else if (status === "rejected") {
                message = `${providerName} rejected a booking from ${residentName}.`;
            } else {
                message = `Booking between ${providerName} and ${residentName} status changed to ${status}.`;
            }

            await createNotification(
                admin.user_id,
                "booking",
                message
            );
        }

        // Real-time: move the booking between phases on both apps instantly.
        emitBookingUpdate({
            bookingId: booking.booking_id,
            status: booking.status,
            action: status === "accepted" ? "accepted" : status,
            providerId: booking.provider_id,
            residentId: booking.resident_id,
            extra: { started_at: booking.started_at || null }
        });

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

            // Notify the resident the service has started (real-time socket).
            const [residentUser, providerUser] = await Promise.all([
                User.findByPk(booking.resident_id, { attributes: ["name"] }),
                User.findByPk(booking.provider_id, { attributes: ["name"] })
            ]);
            const providerName = providerUser?.name || "your provider";
            await createNotification(
                booking.resident_id,
                "booking",
                `${providerName} has started the job. The service is now in progress.`
            );

            // Real-time: flip both apps to "In Progress".
            emitBookingUpdate({
                bookingId: booking.booking_id,
                status: booking.status,
                action: "started",
                providerId: booking.provider_id,
                residentId: booking.resident_id,
                extra: { started_at: booking.started_at }
            });
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

        // Bill by the ACTUAL time worked, priced per minute from the hourly
        // rate (rate/60 per minute). Any partial minute counts as a full
        // minute; minimum 1 minute once work has started.
        //   e.g. hourly rate 900 -> 15/min; 30 min of work -> 450.
        const billableMinutes = Math.max(1, Math.ceil(seconds / 60));
        const finalAmount = Math.round(billableMinutes * (rate / 60));

        // Provider marks the job finished -> it now AWAITS the resident's
        // confirmation before it becomes fully "completed".
        booking.status = "awaiting_confirmation";
        booking.work_duration_seconds = seconds;
        booking.final_amount = finalAmount;
        await booking.save();

        // Resolve names so notifications address people, not booking numbers.
        const [residentUser, providerUser] = await Promise.all([
            User.findByPk(booking.resident_id, { attributes: ["name"] }),
            User.findByPk(booking.provider_id, { attributes: ["name"] })
        ]);
        const residentName = residentUser?.name || "the resident";
        const providerName = providerUser?.name || "your provider";

        // Ask the resident to confirm the job is done (references the provider).
        await createNotification(
            booking.resident_id,
            "booking",
            `${providerName} finished the job. Work time: ${formatDuration(seconds)} · Total: PKR ${finalAmount}. Please confirm the job is complete.`
        );

        // Notify the provider that they're waiting for confirmation (references the resident).
        await createNotification(
            booking.provider_id,
            "booking",
            `The job for ${residentName} is finished. Waiting for them to confirm. Billed PKR ${finalAmount} (${formatDuration(seconds)}).`
        );

        const admin = await getAdmin();
        if (admin) {
            await createNotification(
                admin.user_id,
                "booking",
                `${providerName} finished a job for ${residentName}, awaiting confirmation. Billed PKR ${finalAmount}.`
            );
        }

        // Real-time: move the job to "awaiting payment/confirmation" both sides.
        emitBookingUpdate({
            bookingId: booking.booking_id,
            status: booking.status,
            action: "completed_pending_confirmation",
            providerId: booking.provider_id,
            residentId: booking.resident_id,
            extra: {
                started_at: booking.started_at,
                final_amount: booking.final_amount,
                work_duration_seconds: booking.work_duration_seconds
            }
        });

        res.status(200).json({
            success: true,
            message: "Job finished — waiting for resident confirmation",
            booking: {
                booking_id: booking.booking_id,
                status: booking.status,
                started_at: booking.started_at,
                work_duration_seconds: booking.work_duration_seconds,
                final_amount: booking.final_amount,
                billable_minutes: billableMinutes
            }
        });
    } catch (error) {
        console.error("Complete job error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ==================================================
// Resident confirms the job is done (resident only)
// Moves an "awaiting_confirmation" booking to "completed".
// ==================================================
export const confirmCompletion = async (req, res) => {
    try {
        const residentId = req.user.id;
        const { bookingId } = req.params;

        const booking = await Booking.findByPk(bookingId);
        if (!booking || booking.resident_id !== residentId) {
            return res.status(404).json({ success: false, message: "Booking not found or not authorized" });
        }

        if (booking.status !== "awaiting_confirmation") {
            return res.status(400).json({
                success: false,
                message: `A ${booking.status} booking cannot be paid for yet.`
            });
        }

        // Mock payment: the resident pays the billed amount. Paying completes
        // the job and records the earning for the provider.
        const amount = booking.final_amount != null ? Number(booking.final_amount) : 0;

        booking.paid = true;
        booking.paid_at = new Date();
        booking.status = "completed";
        await booking.save();

        // Resolve names so notifications address people, not booking numbers.
        const [residentUser, providerUser] = await Promise.all([
            User.findByPk(booking.resident_id, { attributes: ["name"] }),
            User.findByPk(booking.provider_id, { attributes: ["name"] })
        ]);
        const residentName = residentUser?.name || "the resident";
        const providerName = providerUser?.name || "your provider";

        await createNotification(
            booking.provider_id,
            "payment",
            `Payment received from ${residentName}: PKR ${amount}. It has been added to your earnings.`
        );
        await createNotification(
            booking.resident_id,
            "payment",
            `Payment of PKR ${amount} to ${providerName} was successful. You can now leave a review.`
        );

        const admin = await getAdmin();
        if (admin) {
            await createNotification(
                admin.user_id,
                "payment",
                `${residentName} paid ${providerName} PKR ${amount} for a completed job.`
            );
        }

        // Real-time: mark the job completed/paid on the provider's app so the
        // earnings and Completed tab update instantly.
        emitBookingUpdate({
            bookingId: booking.booking_id,
            status: booking.status,
            action: "payment_completed",
            providerId: booking.provider_id,
            residentId: booking.resident_id,
            extra: { paid: true, final_amount: booking.final_amount }
        });

        res.status(200).json({
            success: true,
            message: "Payment successful",
            booking: {
                booking_id: booking.booking_id,
                status: booking.status,
                paid: booking.paid,
                final_amount: booking.final_amount,
                work_duration_seconds: booking.work_duration_seconds
            }
        });
    } catch (error) {
        console.error("Payment error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ==================================================
// Provider earnings breakdown (provider only)
// Returns total earnings + the list of paid bookings that make it up.
// ==================================================
export const getEarnings = async (req, res) => {
    try {
        const providerId = req.user.id;

        const paidBookings = await Booking.findAll({
            where: {
                provider_id: providerId,
                paid: true,
                status: "completed"
            },
            include: [
                {
                    model: User,
                    as: "resident",
                    attributes: ["user_id", "name"]
                },
                {
                    model: Service,
                    attributes: ["service_id", "title"]
                }
            ],
            order: [["paid_at", "DESC"]]
        });

        let total = 0;
        const details = paidBookings.map((b) => {
            const amount = Number(b.final_amount) || 0;
            total += amount;
            const seconds = b.work_duration_seconds || 0;
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const duration = h > 0 ? `${h}h ${m}m` : `${m}m`;
            return {
                booking_id: b.booking_id,
                resident_name: b.resident?.name || "Customer",
                service: b.Service?.title || "Service",
                amount,
                duration,
                work_duration_seconds: seconds,
                paid_at: b.paid_at
            };
        });

        res.status(200).json({
            success: true,
            total_earnings: Math.round(total),
            job_count: details.length,
            earnings: details
        });
    } catch (error) {
        console.error("Get earnings error:", error);
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

        // Once the provider has started the job (timer running), the resident
        // can no longer cancel.
        if (booking.status === "accepted" && booking.started_at) {
            return res.status(400).json({
                success: false,
                message: "This job has already started and cannot be cancelled."
            });
        }

        booking.status = "cancelled";
        await booking.save();

        // Resolve names so notifications address people, not booking numbers.
        const [residentUser, providerUser] = await Promise.all([
            User.findByPk(booking.resident_id, { attributes: ["name"] }),
            User.findByPk(booking.provider_id, { attributes: ["name"] })
        ]);
        const residentName = residentUser?.name || "the resident";
        const providerName = providerUser?.name || "the provider";

        // Confirm to the resident who cancelled.
        await createNotification(
            booking.resident_id,
            "booking",
            `Your booking with ${providerName} has been cancelled.`
        );

        // Notify the provider that the resident cancelled (references the resident).
        await createNotification(
            booking.provider_id,
            "booking",
            `${residentName} cancelled the booking.`
        );

        const admin = await getAdmin();
        if (admin) {
            await createNotification(
                admin.user_id,
                "booking",
                `${residentName} cancelled a booking with ${providerName}.`
            );
        }

        // Real-time: remove the cancelled booking from the provider's lists.
        emitBookingUpdate({
            bookingId: booking.booking_id,
            status: booking.status,
            action: "cancelled",
            providerId: booking.provider_id,
            residentId: booking.resident_id
        });

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
