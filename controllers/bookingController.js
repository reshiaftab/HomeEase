import db from "../config/db.js";

// Create Booking
export const createBooking = (req, res) => {
    const residentId = req.user.id;
    const { service_id, booking_date, booking_time } = req.body;

    const findServiceSql = `
        SELECT provider_id 
        FROM services 
        WHERE service_id = ?
    `;

    db.query(findServiceSql, [service_id], (err, serviceResult) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (serviceResult.length === 0) {
            return res.status(404).json({ message: "Service not found" });
        }

        const providerId = serviceResult[0].provider_id;

        const bookingSql = `
            INSERT INTO bookings (resident_id, service_id, provider_id, booking_date, booking_time)
            VALUES (?, ?, ?, ?, ?)
        `;

        db.query(
            bookingSql,
            [residentId, service_id, providerId, booking_date, booking_time],
            (err, result) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                res.status(201).json({
                    message: "Booking created successfully",
                    bookingId: result.insertId
                });
            }
        );
    });
};

// View My Bookings
export const getMyBookings = (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;

    let sql = "";

    if (role === "resident") {
        sql = `
            SELECT 
                b.booking_id,
                b.booking_date,
                b.booking_time,
                b.status,
                s.title AS service_title,
                u.name AS provider_name
            FROM bookings b
            JOIN services s ON b.service_id = s.service_id
            JOIN users u ON b.provider_id = u.user_id
            WHERE b.resident_id = ?
            ORDER BY b.created_at DESC
        `;
    } else if (role === "provider") {
        sql = `
            SELECT 
                b.booking_id,
                b.booking_date,
                b.booking_time,
                b.status,
                s.title AS service_title,
                u.name AS resident_name
            FROM bookings b
            JOIN services s ON b.service_id = s.service_id
            JOIN users u ON b.resident_id = u.user_id
            WHERE b.provider_id = ?
            ORDER BY b.created_at DESC
        `;
    } else {
        return res.status(403).json({ message: "Invalid role" });
    }

    db.query(sql, [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.status(200).json(results);
    });
};

// Update Booking Status
export const updateBookingStatus = (req, res) => {
    const providerId = req.user.id;
    const { bookingId } = req.params;
    const { status } = req.body;

    const sql = `
        UPDATE bookings
        SET status = ?
        WHERE booking_id = ? AND provider_id = ?
    `;

    db.query(sql, [status, bookingId, providerId], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Booking not found or not authorized" });
        }

        res.status(200).json({
            message: "Booking status updated successfully"
        });
    });
};