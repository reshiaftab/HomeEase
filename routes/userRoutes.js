import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import { getProfile, updateProfile } from "../controllers/userController.js";
import { body, validationResult } from "express-validator";

const router = express.Router();

router.get("/profile", authMiddleware, getProfile);

router.put(
    "/profile",
    authMiddleware,
    upload.single("profile_picture"),
    body("name").optional().isLength({ min: 3 }).withMessage("Name must be at least 3 characters"),
    body("email").optional().isEmail().withMessage("Must be a valid email"),
    body("phone").optional().isLength({ min: 10 }).withMessage("Phone number too short"),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        next();
    },
    updateProfile
);

export default router;