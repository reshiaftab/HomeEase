import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { getUserNotifications, markAsRead } from "../controllers/notificationController.js";

const router = express.Router();

// Get all notifications for logged-in user
router.get("/", authMiddleware, getUserNotifications);

// Mark a notification as read
router.put("/:id/read", authMiddleware, markAsRead);

export default router;