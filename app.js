import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import sequelize from "./config/sequelize.js";
import authRoutes from "./routes/authRoutes.js";
import providerAvailabilityRoutes from "./routes/providerAvailabilityRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
//import adminDashboardRoutes from "./routes/adminDashboardRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

import Notification from "./models/Notification.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/providers", providerAvailabilityRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
//app.use("/api/dashboard", adminDashboardRoutes);
app.use("/api/notifications", notificationRoutes);

app.use("/uploads", express.static("uploads"));


app.get("/", (req, res) => {
    res.send("HomeEase API Running...");
});



const PORT = process.env.PORT || 5000;

sequelize.authenticate()
    .then(async () => {
        console.log("Sequelize connected to MySQL");

         // Sync Notification table (creates it if missing)
        await Notification.sync({ alter: true });
        console.log("Notification table is ready");

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("Sequelize connection failed:", error);
    });