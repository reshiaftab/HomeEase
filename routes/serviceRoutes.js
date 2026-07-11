import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import { addService, searchServices } from "../controllers/serviceController.js";
import { body, query, validationResult } from "express-validator";

const router = express.Router();

// POST / add service (provider only) with validation
router.post(
    "/",
    authMiddleware,
    roleMiddleware("provider"),
    body("title").notEmpty().withMessage("Title is required"),
    body("price").isFloat({ min: 0 }).withMessage("Price must be a positive number"),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        next();
    },
    addService
);

// GET /search with query validation
router.get(
    "/search",
    query("category").notEmpty().withMessage("Category is required"),
    query("location").notEmpty().withMessage("Location is required"),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        next();
    },
    searchServices
);

export default router;