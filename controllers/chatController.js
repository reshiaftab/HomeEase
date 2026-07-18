import ChatMessage from "../models/ChatMessage.js";
import { getIo } from "../socket.js";

// Send a message
export const sendMessage = async (req, res) => {
    try {
        const senderId = req.user.id;
        const { booking_id, receiver_id, message } = req.body;

        if (!booking_id || !receiver_id || !message) {
            return res.status(400).json({ message: "booking_id, receiver_id, and message are required" });
        }

        const newMessage = await ChatMessage.create({
            booking_id,
            sender_id: senderId,
            receiver_id,
            message
        });

        // Emit message using your socket instance
        const io = getIo();
        io.to(`booking_${booking_id}`).emit("receiveMessage", newMessage);

        res.status(201).json({ message: "Message sent successfully", chat: newMessage });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get all messages for a booking
export const getMessages = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const messages = await ChatMessage.findAll({
            where: { booking_id: bookingId },
            order: [["created_at", "ASC"]]
        });

        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};