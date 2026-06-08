import express from "express";
import { register, login, forgotPassword, resetPassword } from "../controllers/authController.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

// =========================
// Registration
// =========================
router.post(
    "/register",
    upload.fields([
        { name: "police_certificate", maxCount: 1 },
        { name: "professional_certificate", maxCount: 1 }
    ]),
    register
);

// =========================
// Login
// =========================
router.post("/login", login);

// =========================
// Forgot Password
// =========================
router.post("/forgot-password", forgotPassword);

// =========================
// Reset Password
// =========================
router.post("/reset-password/:token", resetPassword);

export default router;