import db from "../config/db.js";

export const getProviderDashboard = (req, res) => {
    const providerId = req.user.id;

    const sql = `
        SELECT 
            (SELECT COUNT(*) FROM services WHERE provider_id = ?) AS total_services,
            (SELECT COUNT(*) FROM bookings WHERE provider_id = ?) AS total_bookings,
            (SELECT COUNT(*) FROM bookings WHERE provider_id = ? AND status = 'pending') AS pending_bookings,
            (SELECT COUNT(*) FROM bookings WHERE provider_id = ? AND status = 'accepted') AS accepted_bookings,
            (SELECT COUNT(*) FROM bookings WHERE provider_id = ? AND status = 'completed') AS completed_bookings,
            (SELECT COUNT(*) FROM bookings WHERE provider_id = ? AND status = 'rejected') AS rejected_bookings,
            (SELECT COUNT(*) FROM reviews WHERE provider_id = ?) AS total_reviews,
            (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE provider_id = ?) AS average_rating
    `;

    db.query(
        sql,
        [providerId, providerId, providerId, providerId, providerId, providerId, providerId, providerId],
        (err, results) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.status(200).json(results[0]);
        }
    );
};