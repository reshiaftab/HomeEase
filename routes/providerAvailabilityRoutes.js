import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import { setAvailability, getProviderAvailability } from "../controllers/providerAvailabilityController.js";
import { getProviderSlots } from "../controllers/slotController.js";

const router = express.Router();

// Providers set their weekly working-hours slots.
router.post("/set", authMiddleware, roleMiddleware("provider"), setAvailability);

// Bookable 30-minute slots for a provider on a date (resident-facing).
router.get("/:providerId/slots", authMiddleware, (req, res, next) => {
    const providerId = parseInt(req.params.providerId);
    if (isNaN(providerId)) return res.status(400).json({ message: "Invalid provider ID" });
    next();
}, getProviderSlots);

// Any authenticated user can view provider availability with providerId validation
router.get("/:providerId", authMiddleware, (req, res, next) => {
    const providerId = parseInt(req.params.providerId);
    if (isNaN(providerId)) return res.status(400).json({ message: "Invalid provider ID" });
    next();
}, getProviderAvailability);

export default router;