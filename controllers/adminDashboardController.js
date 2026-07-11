import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Review from "../models/Review.js";
import Service from "../models/Service.js";
import sequelize from "../config/sequelize.js";

// Get Admin Dashboard Stats
export const getAdminDashboard = async (req, res) => {
    try {
        // Provider counts in a single query
        const providerStats = await User.findAll({
            where: { role: "provider" },
            attributes: ["approval_status", [sequelize.fn("COUNT", sequelize.col("user_id")), "count"]],
            group: ["approval_status"]
        });

        const statsMap = { pending: 0, approved: 0, rejected: 0 };
        providerStats.forEach(stat => {
            statsMap[stat.approval_status] = parseInt(stat.get("count"));
        });

        const totalProviders = Object.values(statsMap).reduce((a,b) => a+b, 0);

        // Other counts
        const totalResidents = await User.count({ where: { role: "resident" } });
        const totalBookings = await Booking.count();
        const totalReviews = await Review.count();
        const totalServices = await Service.count();

        res.status(200).json({
            totalProviders,
            pendingProviders: statsMap.pending,
            approvedProviders: statsMap.approved,
            rejectedProviders: statsMap.rejected,
            totalResidents,
            totalBookings,
            totalReviews,
            totalServices
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};