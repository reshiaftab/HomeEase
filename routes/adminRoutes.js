import express from "express";
import { getPendingProviders, approveProvider, rejectProvider } from "../controllers/adminController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

// Admin routes for provider management
router.get("/providers/pending", authMiddleware, roleMiddleware("admin"), getPendingProviders);
router.put("/providers/:providerId/approve", authMiddleware, roleMiddleware("admin"), approveProvider);
router.put("/providers/:providerId/reject", authMiddleware, roleMiddleware("admin"), rejectProvider);

// Optional future improvement: unified status update
// router.put("/providers/:providerId/status", authMiddleware, roleMiddleware("admin"), updateProviderStatus);

export default router;