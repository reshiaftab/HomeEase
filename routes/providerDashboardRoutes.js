import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import { getProviderDashboard } from "../controllers/providerDashboardController.js";

const router = express.Router();

router.get("/", authMiddleware, roleMiddleware("provider"), getProviderDashboard);

export default router;