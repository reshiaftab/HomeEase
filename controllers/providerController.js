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

        const dayOfWeek = new Date(date).toLocaleString("en-US", {
            weekday: "short"
        });

        const providers = await User.findAll({
            where: {
                role: "provider",
                service_category: {
                    [Op.like]: `%${category}%`
                },
                approval_status: "approved",
                availability_status: "available",
                [Op.or]: [
                    {
                        city: {
                            [Op.like]: `%${location}%`
                        }
                    },
                    {
                        provider_address: {
                            [Op.like]: `%${location}%`
                        }
                    }
                ]
            },
            attributes: [
                "user_id",
                "name",
                "phone",
                "email",
                "profile_picture",
                "service_category",
                "province",
                "city",
                "provider_address",
                "availability_status",
                "approval_status"
            ],
            include: [
                {
                    model: Service,
                    as: "services",
                    required: false,
                    attributes: [
                        "service_id",
                        "title",
                        "description",
                        "price",
                        "location"
                    ]
                },
                {
                    model: ProviderAvailability,
                    required: true,
                    where: {
                        day_of_week: dayOfWeek,
                        start_time: {
                            [Op.lte]: time
                        },
                        end_time: {
                            [Op.gte]: time
                        }
                    },
                    attributes: []
                },
                {
                    model: Review,
                    as: "providerReviews",
                    required: false,
                    attributes: []
                }
            ],
            order: [
                ["name", "ASC"]
            ]
        });

        const result = providers.map(provider => {
            const services = provider.services || [];
            const service = services.length > 0 ? services[0] : null;

            return {
                provider_id: provider.user_id,
                provider_name: provider.name,
                provider_email: provider.email,
                provider_phone: provider.phone,
                provider_picture: provider.profile_picture,
                service_category: provider.service_category,
                service_id: service ? service.service_id : null,
                service_title: service ? service.title : provider.service_category,
                service_description: service ? service.description : "",
                price: service ? service.price : 0,
                location: provider.city,
                provider_address: provider.provider_address,
                province: provider.province,
                city: provider.city,
                availability_status: provider.availability_status
            };
        });

        res.status(200).json({
            success: true,
            count: result.length,
            providers: result
        });

    } catch (error) {
        console.error("Get recommended providers error:", error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// =========================
// Get All Providers
// =========================
export const getAllProviders = async (req, res) => {
    try {
        const providers = await User.findAll({
            where: {
                role: "provider",
                approval_status: "approved"
            },
            attributes: [
                "user_id",
                "name",
                "email",
                "phone",
                "profile_picture",
                "service_category",
                "province",
                "city",
                "provider_address",
                "availability_status",
                "approval_status"
            ],
            include: [
                {
                    model: Service,
                    as: "services",
                    required: false,
                    attributes: [
                        "service_id",
                        "title",
                        "description",
                        "price",
                        "location"
                    ]
                }
            ],
            order: [
                ["name", "ASC"]
            ]
        });

        const result = providers.map(provider => {
            const service = provider.services && provider.services.length > 0
                ? provider.services[0]
                : null;

            return {
                user_id: provider.user_id,
                name: provider.name,
                email: provider.email,
                phone: provider.phone,
                profile_picture: provider.profile_picture,
                service_category: provider.service_category,
                province: provider.province,
                city: provider.city,
                provider_address: provider.provider_address,
                availability_status: provider.availability_status,
                approval_status: provider.approval_status,
                service_id: service ? service.service_id : null,
                price: service ? service.price : 0
            };
        });

        res.status(200).json({
            success: true,
            count: result.length,
            providers: result
        });

    } catch (error) {
        console.error("Get all providers error:", error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// =========================
// Get Providers By Category
// =========================
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
                service_category: {
                    [Op.like]: category
                },
                approval_status: "approved"
            },
            attributes: [
                "user_id",
                "name",
                "email",
                "phone",
                "service_category",
                "province",
                "city",
                "provider_address",
                "profile_picture",
                "availability_status",
                "approval_status"
            ],
            include: [
                {
                    model: Service,
                    as: "services",
                    required: false,
                    attributes: [
                        "service_id",
                        "title",
                        "description",
                        "price",
                        "location"
                    ]
                }
            ],
            order: [
                ["name", "ASC"]
            ]
        });

        const result = providers.map(provider => {
            const service = provider.services && provider.services.length > 0
                ? provider.services[0]
                : null;

            return {
                user_id: provider.user_id,
                name: provider.name,
                email: provider.email,
                phone: provider.phone,
                service_category: provider.service_category,
                province: provider.province,
                city: provider.city,
                provider_address: provider.provider_address,
                profile_picture: provider.profile_picture,
                availability_status: provider.availability_status,
                approval_status: provider.approval_status,
                service_id: service ? service.service_id : null,
                price: service ? service.price : 0
            };
        });

        res.status(200).json({
            success: true,
            count: result.length,
            providers: result
        });

    } catch (error) {
        console.error("Get providers by category error:", error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};