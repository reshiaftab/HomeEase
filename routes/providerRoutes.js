import express from "express";
import { getRecommendedProviders } from "../controllers/providerController.js";

const router = express.Router();

router.get("/recommendations", getRecommendedProviders);

export default router;