import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import sequelize from "./config/sequelize.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import providerAvailabilityRoutes from "./routes/providerAvailabilityRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import adminAnalyticsRoutes from "./routes/adminAnalyticsRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import providerRoutes from "./routes/providerRoutes.js";
import providerDashboardRoutes from "./routes/providerDashboardRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import chatRoutes from "./routes/chatRoutes.js"; // new chat routes

// Models
import User from "./models/User.js";
import Service from "./models/Service.js";
import ProviderAvailability from "./models/ProviderAvailability.js";
import Review from "./models/Review.js";
import Notification from "./models/Notification.js";
import Booking from "./models/Booking.js";
import ChatMessage from "./models/ChatMessage.js"; // new chat model

// Socket.IO
import { initSocket, getIo } from "./socket.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// Make io accessible in req
app.use((req, res, next) => {
    req.io = getIo();
    next();
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/providers", providerAvailabilityRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin/analytics", adminAnalyticsRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/provider", providerRoutes);
app.use("/api/provider/dashboard", providerDashboardRoutes);
app.use("/api/review", reviewRoutes);
app.use("/api/service", serviceRoutes);
app.use("/api/chat", chatRoutes); // new chat routes

// Serve uploads
app.use("/uploads", express.static("uploads"));

// Root route
app.get("/", (req, res) => {
    res.send("HomeEase API Running...");
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: err.message || "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;

// Sync all models and start server
const models = [User, Service, ProviderAvailability, Review, Notification, Booking, ChatMessage];

sequelize.authenticate()
    .then(async () => {
        console.log("Sequelize connected to MySQL");

        // Sync all models with alter:true
        await Promise.all(models.map(model => model.sync({ alter: true })));

        // Socket.IO live events for chat
        const io = getIo();
        io.on("connection", (socket) => {
            console.log("Client connected:", socket.id);

            // Join a booking room
            socket.on("joinBooking", (bookingId) => {
                socket.join(`booking_${bookingId}`);
            });

            // Receive message and broadcast to booking room
            socket.on("sendMessage", async ({ bookingId, senderId, receiverId, message }) => {
                const chat = await ChatMessage.create({ booking_id: bookingId, sender_id: senderId, receiver_id, message });
                io.to(`booking_${bookingId}`).emit("receiveMessage", chat);
            });

            socket.on("disconnect", () => {
                console.log("Client disconnected:", socket.id);
            });
        });

        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("Sequelize connection failed:", error);
    });