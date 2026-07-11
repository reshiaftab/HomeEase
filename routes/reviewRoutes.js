import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import { addReview, getProviderReviews } from "../controllers/reviewController.js";
import { body, validationResult } from "express-validator";

const router = express.Router();

// Add review (resident only) with validation
router.post(
    "/",
    authMiddleware,
    roleMiddleware("resident"),
    body("rating").isFloat({ min: 1, max: 5 }),
    body("comment").isString().optional({ nullable: true }),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        next();
    },
    addReview
);

// Get provider reviews with providerId validation
router.get(
    "/provider/:providerId",
    authMiddleware,
    roleMiddleware("resident", "provider"),
    (req, res, next) => {
        const providerId = parseInt(req.params.providerId);
        if (isNaN(providerId)) return res.status(400).json({ message: "Invalid provider ID" });
        next();
    },
    getProviderReviews
);

export default router;