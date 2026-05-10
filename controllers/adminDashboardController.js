import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Review from "../models/Review.js";
import Service from "../models/Service.js";

// Get Admin Dashboard Stats
export const getAdminDashboard = async (req, res) => {
    try {
        // Get total number of approved providers, pending providers, and rejected providers
        const totalProviders = await User.count({ where: { role: "provider" } });
        const pendingProviders = await User.count({
            where: { role: "provider", approval_status: "pending" }
        });
        const approvedProviders = await User.count({
            where: { role: "provider", approval_status: "approved" }
        });
        const rejectedProviders = await User.count({
            where: { role: "provider", approval_status: "rejected" }
        });

        // Get total number of residents
        const totalResidents = await User.count({ where: { role: "resident" } });

        // Get total bookings and reviews
        const totalBookings = await Booking.count();
        const totalReviews = await Review.count();

        // Get total services
        const totalServices = await Service.count();

        res.status(200).json({
            totalProviders,
            pendingProviders,
            approvedProviders,
            rejectedProviders,
            totalResidents,
            totalBookings,
            totalReviews,
            totalServices,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};