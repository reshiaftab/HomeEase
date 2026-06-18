import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import { getAdminAnalytics } from "../controllers/adminAnalyticsController.js";

const router = express.Router();

// Admin analytics endpoint
router.get("/", authMiddleware, roleMiddleware("admin"), getAdminAnalytics);

export default router;