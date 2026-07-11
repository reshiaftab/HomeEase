import express from "express";
import { register, login, forgotPassword, resetPassword } from "../controllers/authController.js";
import upload from "../middleware/uploadMiddleware.js";
import { body, validationResult } from "express-validator";

const router = express.Router();

// Helper middleware to handle validation
const validate = (validations) => async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
};

// =========================
// Registration
// =========================
router.post(
    "/register",
    upload.fields([
        { name: "police_certificate", maxCount: 1 },
        { name: "professional_certificate", maxCount: 1 }
    ]),
    validate([
        body("name").notEmpty().withMessage("Name is required"),
        body("email").isEmail().withMessage("Valid email is required"),
        body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
        body("phone").notEmpty().withMessage("Phone is required"),
        body("role").isIn(["resident", "provider", "admin"]).withMessage("Role must be valid")
    ]),
    register
);

// =========================
// Login
// =========================
router.post(
    "/login",
    validate([
        body("email").isEmail().withMessage("Valid email is required"),
        body("password").notEmpty().withMessage("Password is required")
    ]),
    login
);

// =========================
// Forgot Password
// =========================
router.post(
    "/forgot-password",
    validate([ body("email").isEmail().withMessage("Valid email is required") ]),
    forgotPassword
);

// =========================
// Reset Password
// =========================
router.post(
    "/reset-password/:token",
    validate([ body("newPassword").isLength({ min: 8 }).withMessage("Password must be at least 8 characters") ]),
    resetPassword
);

export default router;