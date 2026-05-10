import express from "express";
import { register, login } from "../controllers/authController.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.post(
    "/register",
    upload.fields([
        { name: "police_certificate", maxCount: 1 },
        { name: "professional_certificate", maxCount: 1 }
    ]),
    register
);

router.post("/login", login);

export default router;