import Notification from "../models/Notification.js";
import { getIo } from "../socket.js"; // safe import

// Create notification
export const createNotification = async (user_id, type, message) => {
    try {
        const notification = await Notification.create({ user_id, type, message });

        const io = getIo();
        io.emit(`notification-${user_id}`, notification);

        return notification;
    } catch (error) {
        console.error("Notification creation failed:", error.message);
    }
};

// Get notifications for a user
export const getUserNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const notifications = await Notification.findAll({
            where: { user_id: userId },
            order: [["created_at", "DESC"]]
        });
        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findByPk(id);
        if (!notification) return res.status(404).json({ message: "Notification not found" });

        notification.is_read = true;
        await notification.save();

        res.status(200).json({ message: "Notification marked as read" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};