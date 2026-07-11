import express from "express";
import { getRecommendedProviders } from "../controllers/providerController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get(
    "/recommendations",
    authMiddleware,
    roleMiddleware("resident"),
    (req, res, next) => {
        const { category, location } = req.query;
        if (!category || !location) {
            return res.status(400).json({ message: "Category and location are required" });
        }
        next();
    },
    getRecommendedProviders
);

export default router;