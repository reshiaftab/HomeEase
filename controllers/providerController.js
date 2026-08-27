import User from "../models/User.js";
import Service from "../models/Service.js";
import ProviderAvailability from "../models/ProviderAvailability.js";
import Review from "../models/Review.js";
import { Op, fn, col } from "sequelize";

// GET /api/providers/recommendations
export const getRecommendedProviders = async (req, res) => {
    try {
        const { category, location, date, time } = req.query;

        if (!category || !location || !date || !time) {
            return res.status(400).json({
                message: "category, location, date, and time are required"
            });
        }

        const dayOfWeek = new Date(date).toLocaleString('en-US', { weekday: 'short' });

        const services = await Service.findAll({
            where: {
                title: { [Op.like]: `%${category}%` },
                location: { [Op.like]: `%${location}%` }
            },
            include: [
                {
                    model: User,
                    attributes: ["user_id", "name", "role", "availability_status", "approval_status", "profile_picture"],
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
                    attributes: []
                }
            ],
            attributes: {
                include: [
                    [fn("AVG", col("Reviews.rating")), "average_rating"],
                    [fn("COUNT", col("Reviews.review_id")), "total_reviews"]
                ]
            },
            group: ["Service.service_id"]
        });

        const result = services.map(service => ({
            provider_id: service.User.user_id,
            provider_name: service.User.name,
            provider_picture: service.User.profile_picture,
            service_id: service.service_id,
            service_title: service.title,
            location: service.location,
            average_rating: parseFloat(service.get("average_rating")) || 0,
            total_reviews: parseInt(service.get("total_reviews")) || 0
        }));

        result.sort((a, b) => b.average_rating - a.average_rating);

        res.status(200).json(result);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};


// GET /api/provider/category/:category
// Get all approved providers by service category
export const getProvidersByCategory = async (req, res) => {
    try {

        const { category } = req.params;

        if (!category) {
            return res.status(400).json({
                message: "Category is required"
            });
        }

        const providers = await User.findAll({
            where: {
                role: "provider",
                service_category: category,
                approval_status: "approved"
            },
            attributes: [
                "user_id",
                "name",
                "phone",
                "service_category",
                "province",
                "city",
                "profile_picture",
                "availability_status"
            ]
        });

        res.status(200).json({
            success: true,
            count: providers.length,
            providers
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: error.message
        });

    }
};