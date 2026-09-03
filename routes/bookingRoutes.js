import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import {
    createBooking,
    getMyBookings,
    updateBookingStatus,
    cancelBooking,
    startJob,
    completeJob,
    confirmCompletion,
    getEarnings
} from "../controllers/bookingController.js";

const router = express.Router();

// Create booking (resident only)
router.post("/", authMiddleware, roleMiddleware("resident"), createBooking);

// View my bookings (resident or provider)
router.get("/my-bookings", authMiddleware, (req,res,next) => {
    if (!["resident","provider"].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
    }
    next();
}, getMyBookings);

// Provider total earnings + per-job breakdown (provider only).
router.get("/earnings", authMiddleware, roleMiddleware("provider"), getEarnings);

// Cancel a booking (resident only)
router.put("/:bookingId/cancel", authMiddleware, roleMiddleware("resident"), (req,res,next)=>{
    const bookingId = parseInt(req.params.bookingId);
    if (isNaN(bookingId)) return res.status(400).json({message: "Invalid bookingId"});
    next();
}, cancelBooking);

// Start the job timer (provider only) — booking must be accepted.
router.put("/:bookingId/start", authMiddleware, roleMiddleware("provider"), (req,res,next)=>{
    const bookingId = parseInt(req.params.bookingId);
    if (isNaN(bookingId)) return res.status(400).json({message: "Invalid bookingId"});
    next();
}, startJob);

// Complete the job (provider only) — timer must have been started.
router.put("/:bookingId/complete", authMiddleware, roleMiddleware("provider"), (req,res,next)=>{
    const bookingId = parseInt(req.params.bookingId);
    if (isNaN(bookingId)) return res.status(400).json({message: "Invalid bookingId"});
    next();
}, completeJob);

// Resident confirms the job is done (resident only) — moves an
// "awaiting_confirmation" booking to "completed".
router.put("/:bookingId/confirm", authMiddleware, roleMiddleware("resident"), (req,res,next)=>{
    const bookingId = parseInt(req.params.bookingId);
    if (isNaN(bookingId)) return res.status(400).json({message: "Invalid bookingId"});
    next();
}, confirmCompletion);

// Resident pays for a finished job (mock payment) — also completes it.
router.put("/:bookingId/pay", authMiddleware, roleMiddleware("resident"), (req,res,next)=>{
    const bookingId = parseInt(req.params.bookingId);
    if (isNaN(bookingId)) return res.status(400).json({message: "Invalid bookingId"});
    next();
}, confirmCompletion);

// Update booking status (provider only) with validation
router.put("/:bookingId/status", authMiddleware, roleMiddleware("provider"), (req,res,next)=>{
    const bookingId = parseInt(req.params.bookingId);
    if (isNaN(bookingId)) return res.status(400).json({message: "Invalid bookingId"});
    const validStatus = ["pending","accepted","completed","rejected"];
    if (!validStatus.includes(req.body.status)) {
        return res.status(400).json({message: "Invalid status value"});
    }
    next();
}, updateBookingStatus);

export default router;