import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import { getProviderDashboard } from "../controllers/providerDashboardController.js";

const router = express.Router();

router.get(
    "/",
    authMiddleware,
    roleMiddleware("provider"),
    (req, res, next) => {
        // Optional: validate query params if any, e.g., from/to dates
        const { from, to } = req.query;
        if (from && isNaN(Date.parse(from))) return res.status(400).json({ message: "Invalid 'from' date" });
        if (to && isNaN(Date.parse(to))) return res.status(400).json({ message: "Invalid 'to' date" });
        next();
    },
    getProviderDashboard
);

export default router;