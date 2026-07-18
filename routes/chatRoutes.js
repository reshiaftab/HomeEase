import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { sendMessage, getMessages } from "../controllers/chatController.js";

const router = express.Router();

// Send a message (authenticated user)
router.post("/send", authMiddleware, sendMessage);

// Get all messages for a booking
router.get("/:bookingId", authMiddleware, getMessages);

export default router;