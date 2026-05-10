import db from "../config/db.js";

export const getRecommendedProviders = (req, res) => {
    const { category, location } = req.query;

    if (!category || !location) {
        return res.status(400).json({
            message: "Category and location are required"
        });
    }

    const sql = `
        SELECT 
            u.user_id AS provider_id,
            u.name AS provider_name,
            u.email AS provider_email,
            u.phone AS provider_phone,
            s.service_id,
            s.title AS service_title,
            s.description,
            s.price,
            s.location,
            COALESCE(AVG(r.rating), 0) AS average_rating,
            COUNT(r.review_id) AS total_reviews
        FROM services s
        JOIN users u ON s.provider_id = u.user_id
        LEFT JOIN reviews r ON r.provider_id = u.user_id
        WHERE s.title LIKE ? AND s.location LIKE ?
        GROUP BY 
            u.user_id,
            u.name,
            u.email,
            u.phone,
            s.service_id,
            s.title,
            s.description,
            s.price,
            s.location
        ORDER BY average_rating DESC, total_reviews DESC
    `;

    db.query(sql, [`%${category}%`, `%${location}%`], (err, results) => {
        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.status(200).json(results);
    });
};