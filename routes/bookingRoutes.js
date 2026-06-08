import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import {
    createBooking,
    getMyBookings,
    updateBookingStatus
} from "../controllers/bookingController.js";

const router = express.Router();

// Create booking (resident only)
router.post("/", authMiddleware, roleMiddleware("resident"), createBooking);

// View my bookings (resident or provider)
router.get("/my-bookings", authMiddleware, roleMiddleware("resident", "provider"), getMyBookings);

// Update booking status (provider only)
router.put("/:bookingId/status", authMiddleware, roleMiddleware("provider"), updateBookingStatus);

export default router;