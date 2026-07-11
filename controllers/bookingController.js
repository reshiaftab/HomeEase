import Booking from "../models/Booking.js";
import ProviderAvailability from "../models/ProviderAvailability.js";
import Service from "../models/Service.js";
import User from "../models/User.js";
import { Op } from "sequelize";
import { createNotification } from "./notificationController.js";

// Create Booking with availability check
export const createBooking = async (req, res) => {
    try {
        const residentId = req.user.id;
        const { service_id, booking_date, booking_time } = req.body;

        // Validate inputs
        if (!service_id || !booking_date || !booking_time) {
            return res.status(400).json({ message: "service_id, booking_date and booking_time are required" });
        }

        const service = await Service.findByPk(service_id);
        if (!service) {
            return res.status(404).json({ message: "Service not found" });
        }
        const providerId = service.provider_id;

        const dayOfWeek = new Date(booking_date).toLocaleString('en-US', { weekday: 'short' });

        const availableSlot = await ProviderAvailability.findOne({
            where: {
                provider_id: providerId,
                day_of_week: dayOfWeek,
                start_time: { [Op.lte]: booking_time },
                end_time: { [Op.gte]: booking_time }
            }
        });

        if (!availableSlot) {
            return res.status(400).json({ message: "Provider is not available at this time" });
        }

        const existingBooking = await Booking.findOne({
            where: { provider_id: providerId, booking_date, booking_time }
        });

        if (existingBooking) {
            return res.status(400).json({ message: "This time slot is already booked" });
        }

        const newBooking = await Booking.create({
            resident_id: residentId,
            service_id,
            provider_id: providerId,
            booking_date,
            booking_time,
            status: "pending"
        });

        await createNotification(providerId, "booking", `New booking request for ${booking_date} at ${booking_time}`);
        await createNotification(residentId, "booking", `Your booking request for ${booking_date} at ${booking_time} has been sent to the provider.`);

        // Return full booking details including service and provider info
        const bookingDetails = await Booking.findByPk(newBooking.booking_id, {
            include: [
                { model: Service, attributes: ["title", "description", "price"] },
                { model: User, as: "provider", attributes: ["name", "email", "phone"] }
            ]
        });

        res.status(201).json({
            message: "Booking created successfully",
            booking: bookingDetails
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// View my bookings (resident/provider)
export const getMyBookings = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        let bookings;

        if (role === "resident") {
            bookings = await Booking.findAll({
                where: { resident_id: userId },
                include: [
                    { model: Service, attributes: ["title", "description", "price"] },
                    { model: User, as: "provider", attributes: ["name", "email", "phone"] }
                ]
            });
        } else if (role === "provider") {
            bookings = await Booking.findAll({
                where: { provider_id: userId },
                include: [
                    { model: Service, attributes: ["title", "description", "price"] },
                    { model: User, as: "resident", attributes: ["name", "email", "phone"] }
                ]
            });
        } else {
            return res.status(403).json({ message: "Invalid role" });
        }

        res.status(200).json(bookings);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update booking status (provider)
export const updateBookingStatus = async (req, res) => {
    try {
        const providerId = req.user.id;
        const { bookingId } = req.params;
        const { status } = req.body;

        // Validate status
        const validStatus = ["pending", "accepted", "completed", "rejected"];
        if (!validStatus.includes(status)) {
            return res.status(400).json({ message: "Invalid status value" });
        }

        const booking = await Booking.findByPk(bookingId);

        if (!booking || booking.provider_id !== providerId) {
            return res.status(404).json({ message: "Booking not found or not authorized" });
        }

        booking.status = status;
        await booking.save();

        await createNotification(booking.resident_id, "booking", `Your booking status has been updated to "${status}" by the provider.`);

        res.status(200).json({ message: "Booking status updated successfully" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};