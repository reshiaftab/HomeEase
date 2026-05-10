import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import {
    createBooking,
    getMyBookings,
    updateBookingStatus
} from "../controllers/bookingController.js";

const router = express.Router();

router.post("/", authMiddleware, roleMiddleware("resident"), createBooking);
router.get("/my-bookings", authMiddleware, roleMiddleware("resident", "provider"), getMyBookings);
router.put("/:bookingId/status", authMiddleware, roleMiddleware("provider"), updateBookingStatus);

export default router;