import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import { getAdminAnalytics } from "../controllers/adminAnalyticsController.js";

const router = express.Router();

// Middleware to validate period query parameter
const validatePeriod = (req, res, next) => {
    const period = req.query.period;
    if (period && !["daily", "weekly", "monthly"].includes(period)) {
        return res.status(400).json({ message: "Invalid period parameter" });
    }
    next();
};

// Admin analytics endpoint
router.get("/", authMiddleware, roleMiddleware("admin"), validatePeriod, getAdminAnalytics);

export default router;