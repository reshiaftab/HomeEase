import Booking from "../models/Booking.js";
import User from "../models/User.js";
import Review from "../models/Review.js";
import Service from "../models/Service.js";
import { Op, fn, col } from "sequelize";

// GET /api/admin/analytics?period=monthly
export const getAdminAnalytics = async (req, res) => {
    try {
        const period = req.query.period || "monthly"; // daily, weekly, monthly

        // Determine start date based on period
        let startDate;
        const today = new Date();
        if (period === "daily") {
            startDate = new Date(today.setHours(0,0,0,0));
        } else if (period === "weekly") {
            const day = today.getDay();
            startDate = new Date(today);
            startDate.setDate(today.getDate() - day);
            startDate.setHours(0,0,0,0);
        } else {
            // monthly
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        }

        // 1️⃣ Total bookings in period
        const totalBookings = await Booking.count({
            where: { created_at: { [Op.gte]: startDate } }
        });

        // 2️⃣ Pending provider approvals
        const pendingProviders = await User.count({
            where: { role: "provider", approval_status: "pending" }
        });

        // 3️⃣ Top-rated providers
        const topProviders = await Review.findAll({
            attributes: [
                "provider_id",
                [fn("AVG", col("rating")), "avg_rating"]
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

        // 6️⃣ Optional: bookings by status
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
        res.status(500).json({ error: error.message });
    }
};