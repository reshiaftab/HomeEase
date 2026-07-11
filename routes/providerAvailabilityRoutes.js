import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import { setAvailability, getProviderAvailability } from "../controllers/providerAvailabilityController.js";

const router = express.Router();

// Only providers can set availability
router.post("/set", authMiddleware, roleMiddleware("provider"), setAvailability);

// Any authenticated user can view provider availability with providerId validation
router.get("/:providerId", authMiddleware, (req, res, next) => {
    const providerId = parseInt(req.params.providerId);
    if (isNaN(providerId)) return res.status(400).json({ message: "Invalid provider ID" });
    next();
}, getProviderAvailability);

export default router;