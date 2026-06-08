import User from "../models/User.js";
import Service from "../models/Service.js";
import ProviderAvailability from "../models/ProviderAvailability.js";
import Review from "../models/Review.js";
import { Op } from "sequelize";

// GET /api/providers/recommendations?category=Electrician&location=Lahore&date=2026-06-06&time=14:00:00
export const getRecommendedProviders = async (req, res) => {
    try {
        const { category, location, date, time } = req.query;

        if (!category || !location || !date || !time) {
            return res.status(400).json({
                message: "category, location, date, and time are required"
            });
        }

        // Determine the day of week
        const dayOfWeek = new Date(date).toLocaleString('en-US', { weekday: 'short' }); // Mon, Tue, etc.

        // Find available providers
        const services = await Service.findAll({
            where: {
                title: { [Op.like]: `%${category}%` },
                location: { [Op.like]: `%${location}%` }
            },
            include: [
                {
                    model: User,
                    attributes: ["user_id", "name", "role", "availability_status", "approval_status"],
                    where: {
                        role: "provider",
                        approval_status: "approved",
                        availability_status: "available"
                    }
                },
                {
                    model: ProviderAvailability,
                    required: true,
                    where: {
                        day_of_week: dayOfWeek,
                        start_time: { [Op.lte]: time },
                        end_time: { [Op.gte]: time }
                    }
                },
                {
                    model: Review,
                    attributes: ["rating"]
                }
            ]
        });

        // Compute average rating and total reviews
        const result = services.map(service => {
            const reviews = service.Reviews || [];
            const avgRating = reviews.length
                ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
                : 0;

            return {
                provider_id: service.User.user_id,
                provider_name: service.User.name,
                service_id: service.service_id,
                service_title: service.title,
                location: service.location,
                average_rating: avgRating.toFixed(2),
                total_reviews: reviews.length
            };
        });

        // Sort by average_rating descending
        result.sort((a, b) => b.average_rating - a.average_rating);

        res.status(200).json(result);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};