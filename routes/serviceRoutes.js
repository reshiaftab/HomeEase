import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import { addService, searchServices } from "../controllers/serviceController.js";

const router = express.Router();

router.post("/", authMiddleware, roleMiddleware("provider"), addService);
router.get("/search", searchServices);

export default router;