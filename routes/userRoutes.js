import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import { getProfile, updateProfile } from "../controllers/userController.js";

const router = express.Router();

router.get("/profile", authMiddleware, getProfile);

router.put(
    "/profile",
    authMiddleware,
    upload.single("profile_picture"),
    updateProfile
);

export default router;