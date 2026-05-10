import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import { addReview, getProviderReviews } from "../controllers/reviewController.js";

const router = express.Router();

router.post("/", authMiddleware, roleMiddleware("resident"), addReview);
router.get("/provider/:providerId", authMiddleware, roleMiddleware("resident", "provider"), getProviderReviews);

export default router;