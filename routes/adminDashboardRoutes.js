import express from "express";
import { getAdminDashboard } from "../controllers/adminDashboardController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

// Admin dashboard route
router.get("/dashboard", authMiddleware, roleMiddleware("admin"), getAdminDashboard);

export default router;