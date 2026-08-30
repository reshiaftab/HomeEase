import express from "express";

import { 
    getRecommendedProviders, 
    getProvidersByCategory,
    getAllProviders
} from "../controllers/providerController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

// Get all approved providers
router.get(
    "/all",
    authMiddleware,
    roleMiddleware("resident"),
    getAllProviders
);

// Get all providers by category
// Example: /api/provider/category/Electrician
router.get(
    "/category/:category",
    getProvidersByCategory
);


// Get recommended providers based on category, location, availability
router.get(
    "/recommendations",
    authMiddleware,
    roleMiddleware("resident"),
    (req, res, next) => {

        const { category, location } = req.query;

        if (!category || !location) {
            return res.status(400).json({
                message: "Category and location are required"
            });
        }

        next();
    },
    getRecommendedProviders
);


export default router;