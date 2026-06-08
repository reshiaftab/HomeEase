import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import { setAvailability, getProviderAvailability } from "../controllers/providerAvailabilityController.js";

const router = express.Router();

// Only providers can set availability
router.post("/set", authMiddleware, roleMiddleware("provider"), setAvailability);

// Any authenticated user can view provider availability
router.get("/:providerId", authMiddleware, getProviderAvailability);

export default router;