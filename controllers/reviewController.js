import db from "../config/db.js";

// Add Review
export const addReview = (req, res) => {

    const residentId = req.user.id;
    const { booking_id, rating, comment } = req.body;

    const findBooking = `
        SELECT provider_id 
        FROM bookings
        WHERE booking_id = ? AND resident_id = ?
    `;

    db.query(findBooking, [booking_id, residentId], (err, bookingResult) => {

        if (err) return res.status(500).json({ error: err.message });

        if (bookingResult.length === 0) {
            return res.status(404).json({ message: "Booking not found" });
        }

        const providerId = bookingResult[0].provider_id;

        const insertReview = `
            INSERT INTO reviews (booking_id, resident_id, provider_id, rating, comment)
            VALUES (?, ?, ?, ?, ?)
        `;

        db.query(
            insertReview,
            [booking_id, residentId, providerId, rating, comment],
            (err, result) => {

                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                res.status(201).json({
                    message: "Review added successfully"
                });

            }
        );

    });

};


// Get Provider Reviews
export const getProviderReviews = (req, res) => {

    const providerId = req.params.providerId;

    const sql = `
        SELECT 
            r.review_id,
            r.rating,
            r.comment,
            r.created_at,
            u.name AS resident_name
        FROM reviews r
        JOIN users u ON r.resident_id = u.user_id
        WHERE r.provider_id = ?
        ORDER BY r.created_at DESC
    `;

    db.query(sql, [providerId], (err, results) => {

        if (err) return res.status(500).json({ error: err.message });

        res.status(200).json(results);

    });

};