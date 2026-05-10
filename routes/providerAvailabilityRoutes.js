import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import { updateAvailability } from "../controllers/providerAvailabilityController.js";

const router = express.Router();

router.put(
    "/availability",
    authMiddleware,
    roleMiddleware("provider"),
    updateAvailability
);

export default router;