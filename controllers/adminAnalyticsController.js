import Booking from "../models/Booking.js";
import User from "../models/User.js";
import Review from "../models/Review.js";
import Service from "../models/Service.js";
import { Op, fn, col } from "sequelize";

// GET /api/admin/analytics?period=monthly
export const getAdminAnalytics = async (req, res) => {
    try {
        const period = req.query.period || "monthly"; // daily, weekly, monthly
        const now = new Date();
        let startDate;

        // Calculate start date based on period
        if (period === "daily") {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (period === "weekly") {
            const day = now.getDay();
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
        } else {
            // monthly
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        // 1️⃣ Total bookings in period
        const totalBookings = await Booking.count({
            where: { created_at: { [Op.gte]: startDate } }
        });

        // 2️⃣ Pending provider approvals
        const pendingProviders = await User.count({
            where: { role: "provider", approval_status: "pending" }
        });

        // 3️⃣ Top-rated providers (avg rating + total reviews)
        const topProviders = await Review.findAll({
            attributes: [
                "provider_id",
                [fn("AVG", col("rating")), "avg_rating"],
                [fn("COUNT", col("review_id")), "total_reviews"]
            ],
            group: ["provider_id"],
            order: [[fn("AVG", col("rating")), "DESC"]],
            limit: 5
        });

        // 4️⃣ User summaries
        const totalResidents = await User.count({ where: { role: "resident" } });
        const totalApprovedProviders = await User.count({ where: { role: "provider", approval_status: "approved" } });

        // 5️⃣ Service summaries
        const totalServices = await Service.count();

        // 6️⃣ Bookings by status
        const bookingsByStatus = await Booking.findAll({
            attributes: ["status", [fn("COUNT", col("booking_id")), "count"]],
            group: ["status"]
        });

        res.status(200).json({
            period,
            totalBookings,
            bookingsByStatus,
            pendingProviders,
            topProviders,
            totalResidents,
            totalApprovedProviders,
            totalServices
        });

    } catch (error) {
        res.status(500).json({
            error: "Failed to fetch admin analytics: " + error.message
        });
    }
};