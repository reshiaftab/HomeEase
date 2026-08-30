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

        if (provider.availability_status !== "available") {
            return res.status(400).json({
                message: "Provider is currently unavailable"
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

        const existingBooking = await Booking.findOne({
            where: {
                provider_id: provider.user_id,
                booking_date,
                booking_time,
                status: {
                    [Op.not]: "rejected"
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
                            "provider_address"
                        ]
                    },
                    {
                        model: User,
                        as: "resident",
                        attributes: [
                            "user_id",
                            "name",
                            "email",
                            "phone"
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
                            "provider_address"
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
                            "phone"
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