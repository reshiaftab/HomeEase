import express from "express";
import { register, login, forgotPassword, updatePassword, verifyPin } from "../controllers/authController.js";
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

// -------------------
// Provider signup info
// -------------------
const provinces = ["Punjab", "Sindh", "Khyber Pakhtunkhwa", "Balochistan", "Gilgit-Baltistan", "Islamabad"];
const cities = {
    "Punjab": ["Lahore", "Rawalpindi", "Faisalabad"],
    "Sindh": ["Karachi", "Hyderabad", "Sukkur"],
    "Khyber Pakhtunkhwa": ["Peshawar", "Mardan"],
    "Balochistan": ["Quetta", "Gwadar"],
    "Gilgit-Baltistan": ["Gilgit", "Skardu"],
    "Islamabad": ["Islamabad"]
};
const serviceCategories = ["Electrician", "Plumber", "Painter", "Cleaner", "Carpenter"];

// =========================
// Registration
// =========================
router.post(
    "/register",
    upload.fields([
        { name: "police_certificate", maxCount: 1 },
        { name: "professional_certificate", maxCount: 1 },
        { name: "profile_picture", maxCount: 1 }
    ]),
    validate([
        body("name")
            .notEmpty()
            .withMessage("Name is required"),

        body("email")
            .isEmail()
            .withMessage("Valid email is required"),

        body("password")
            .isLength({ min: 8 })
            .withMessage("Password must be at least 8 characters"),

        body("phone")
            .notEmpty()
            .withMessage("Phone is required"),

        body("role")
            .optional()
            .isIn(["resident", "provider", "admin"])
            .withMessage("Role must be valid"),

        body("cnic")
            .if(body("role").equals("provider"))
            .notEmpty()
            .withMessage("CNIC is required"),

        body("province")
            .if(body("role").equals("provider"))
            .notEmpty()
            .isIn(provinces)
            .withMessage("Valid province is required"),

        body("city")
            .if(body("role").equals("provider"))
            .notEmpty()
            .custom((value, { req }) => {
                if (!cities[req.body.province]?.includes(value)) {
                    throw new Error("Invalid city for selected province");
                }
                return true;
            }),

        body("service_category")
            .if(body("role").equals("provider"))
            .notEmpty()
            .isIn(serviceCategories)
            .withMessage("Valid service category is required"),

        body("provider_address")
            .if(body("role").equals("provider"))
            .notEmpty()
            .isLength({ min: 5 })
            .withMessage("Provider address is required and must be at least 5 characters")
    ]),
    register
);

// =========================
// Login
// =========================
router.post(
    "/login",
    validate([
        body("email")
            .isEmail()
            .withMessage("Valid email is required"),

        body("password")
            .notEmpty()
            .withMessage("Password is required")
    ]),
    login
);

// =========================
// Forgot Password
// =========================
router.post(
    "/forgot-password",
    validate([
        body("email")
            .isEmail()
            .withMessage("Valid email is required")
    ]),
    forgotPassword
);

// =========================
// Verify PIN
// =========================
router.post(
    "/verify-pin",
    validate([
        body("email")
            .isEmail()
            .withMessage("Valid email is required"),

        body("pin")
            .isLength({ min: 4, max: 4 })
            .withMessage("PIN must be 4 digits")
    ]),
    verifyPin
);

// =========================
// Reset Password
// =========================
router.post(
    "/update-password",
    validate([
        body("email")
            .isEmail()
            .withMessage("Valid email is required"),

        body("pin")
            .isLength({ min: 4, max: 4 })
            .withMessage("PIN must be 4 digits"),

        body("newPassword")
            .isLength({ min: 8 })
            .withMessage("Password must be at least 8 characters"),

        body("confirmPassword")
            .notEmpty()
            .withMessage("Confirm password is required")
    ]),
    updatePassword
);

export default router;