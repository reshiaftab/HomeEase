import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { getUserNotifications, markAsRead } from "../controllers/notificationController.js";

const router = express.Router();

// Get all notifications for logged-in user
router.get("/", authMiddleware, getUserNotifications);

// Mark a notification as read with validation
router.put("/:id/read", authMiddleware, (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid notification id" });
    next();
}, markAsRead);

export default router;