import express from "express";
import { getAdminDashboard } from "../controllers/adminDashboardController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

// Optional middleware to validate period query
const validatePeriod = (req, res, next) => {
    const period = req.query.period;
    if (period && !["daily", "weekly", "monthly"].includes(period)) {
        return res.status(400).json({ message: "Invalid period parameter" });
    }
    next();
};

// Admin dashboard route
router.get("/dashboard", authMiddleware, roleMiddleware("admin"), validatePeriod, getAdminDashboard);

export default router;