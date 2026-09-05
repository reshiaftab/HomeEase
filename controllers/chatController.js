import ChatMessage from "../models/ChatMessage.js";
import { Op } from "sequelize";
import { getIo, emitToUsers, bookingRoom } from "../socket.js";

// Chat messages are retained for 30 days after they are sent, then deleted.
const MESSAGE_RETENTION_DAYS = 30;

/**
 * Delete chat messages older than the retention window.
 * Called automatically whenever messages are read, so expired conversations
 * are cleaned up without needing a separate cron job.
 *
 * @param {number|null} bookingId - when provided, only that conversation is
 *        cleaned; otherwise all expired messages are removed.
 */
export async function deleteExpiredMessages(bookingId = null) {
    try {
        const cutoff = new Date(Date.now() - MESSAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
        const where = { created_at: { [Op.lt]: cutoff } };
        if (bookingId != null) where.booking_id = bookingId;

        const deleted = await ChatMessage.destroy({ where });
        if (deleted > 0) {
            console.log(`[chat] Deleted ${deleted} message(s) older than ${MESSAGE_RETENTION_DAYS} days`);
        }
        return deleted;
    } catch (error) {
        // Cleanup must never break reading messages.
        console.error("[chat] Expired message cleanup failed:", error.message);
        return 0;
    }
}

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

        // Emit message: to the open-chat booking room AND to both users'
        // personal rooms so a recipient sitting on their conversation LIST
        // (not inside this chat) still receives it live.
        const io = getIo();
        io.to(bookingRoom(booking_id)).emit("receiveMessage", newMessage);
        emitToUsers([senderId, receiver_id], "receiveMessage", newMessage);

        res.status(201).json({ message: "Message sent successfully", chat: newMessage });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get all messages for a booking
export const getMessages = async (req, res) => {
    try {
        const { bookingId } = req.params;

        // Auto-delete messages past the 30-day retention window first.
        await deleteExpiredMessages(bookingId);

        const messages = await ChatMessage.findAll({
            where: { booking_id: bookingId },
            order: [["created_at", "ASC"]]
        });

        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};