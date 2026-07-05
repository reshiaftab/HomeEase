import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http"; // Import Node HTTP
import sequelize from "./config/sequelize.js";
import authRoutes from "./routes/authRoutes.js";
import providerAvailabilityRoutes from "./routes/providerAvailabilityRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import Notification from "./models/Notification.js";
import adminAnalyticsRoutes from "./routes/adminAnalyticsRoutes.js";
import Booking from "./models/Booking.js";

dotenv.config();
const app = express();
const server = http.createServer(app); // Create HTTP server

// Socket.IO setup
import { Server } from "socket.io";
export const io = new Server(server, {
    cors: {
        origin: "*", // Or restrict to your frontend URL
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/providers", providerAvailabilityRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin/analytics", adminAnalyticsRoutes);
app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
    res.send("HomeEase API Running...");
});

// Socket.IO connection event
io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});

const PORT = process.env.PORT || 5000;

sequelize.authenticate()
    .then(async () => {
        console.log("Sequelize connected to MySQL");

        // Sync tables
        await Notification.sync({ alter: true });
        // sync bookings
        await Booking.sync({ alter: true });

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("Sequelize connection failed:", error);
    });