// socket.js
import { Server } from "socket.io";

let io = null;

// Per-user room name. Every authenticated client joins `user_<id>` right after
// connecting, so we can target a specific provider/resident regardless of
// which booking rooms they happen to have open.
export const userRoom = (userId) => `user_${userId}`;
export const bookingRoom = (bookingId) => `booking_${bookingId}`;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*", // restrict to frontend URL in production
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        console.log("Client connected:", socket.id);

        // Join a per-user room for targeted pushes (booking updates, etc.).
        socket.on("joinUser", (userId) => {
            if (userId == null) return;
            socket.join(userRoom(userId));
        });

        // Join a booking chat room.
        socket.on("joinBooking", (bookingId) => {
            if (bookingId == null) return;
            socket.join(bookingRoom(bookingId));
        });

        socket.on("leaveBooking", (bookingId) => {
            if (bookingId == null) return;
            socket.leave(bookingRoom(bookingId));
        });

        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
        });
    });

    return io;
};

export const getIo = () => {
    if (!io) throw new Error("Socket.io not initialized!");
    return io;
};

/**
 * Emit an event to one or more specific users (their personal rooms).
 * @param {number|number[]} userIds
 * @param {string} event
 * @param {*} payload
 */
export const emitToUsers = (userIds, event, payload) => {
    try {
        const io = getIo();
        const ids = Array.isArray(userIds) ? userIds : [userIds];
        for (const id of ids) {
            if (id == null) continue;
            io.to(userRoom(id)).emit(event, payload);
        }
    } catch (e) {
        console.log("Socket emit skipped:", e.message);
    }
};

/**
 * Push a booking update to BOTH the provider and the resident in real time.
 * The provider app listens for `booking-update` to instantly refresh its
 * Incoming / Upcoming / In-Progress / Completed lists without a manual reload.
 *
 * @param {object} opts
 * @param {number} bookingId
 * @param {string} status      current booking status
 * @param {number} providerId
 * @param {number} residentId
 * @param {string} [action]    optional hint, e.g. 'new_booking' | 'accepted'
 * @param {object} [extra]     extra fields (started_at, completed_at, etc.)
 */
export const emitBookingUpdate = ({
    bookingId,
    status,
    providerId,
    residentId,
    action,
    extra = {}
}) => {
    emitToUsers([providerId, residentId], "booking-update", {
        booking_id: bookingId,
        bookingId,
        status,
        action: action || status,
        provider_id: providerId,
        resident_id: residentId,
        ...extra
    });
};
