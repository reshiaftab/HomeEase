import Service from "../models/Service.js";
import Booking from "../models/Booking.js";
import Review from "../models/Review.js";
import { Op, fn, col } from "sequelize";

export const getProviderDashboard = async (req, res) => {
    try {
        const providerId = req.user.id;

        // Execute all counts in parallel
        const [
            total_services,
            total_bookings,
            pending_bookings,
            accepted_bookings,
            completed_bookings,
            rejected_bookings,
            total_reviews,
            average_rating
        ] = await Promise.all([
            Service.count({ where: { provider_id: providerId } }),
            Booking.count({ where: { provider_id: providerId } }),
            Booking.count({ where: { provider_id: providerId, status: "pending" } }),
            Booking.count({ where: { provider_id: providerId, status: "accepted" } }),
            Booking.count({ where: { provider_id: providerId, status: "completed" } }),
            Booking.count({ where: { provider_id: providerId, status: "rejected" } }),
            Review.count({ where: { provider_id: providerId } }),
            Review.findAll({
                where: { provider_id: providerId },
                attributes: [[fn("AVG", col("rating")), "avg_rating"]]
            }).then(result => parseFloat(result[0].get("avg_rating")) || 0)
        ]);

        res.status(200).json({
            total_services,
            total_bookings,
            pending_bookings,
            accepted_bookings,
            completed_bookings,
            rejected_bookings,
            total_reviews,
            average_rating
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};