import Service from "../models/Service.js";
import User from "../models/User.js";
import { Op } from "sequelize";

// Add a new service (provider only)
export const addService = async (req, res) => {
    try {
        const providerId = req.user.id;
        const { title, description, price, location } = req.body;

        if (!title || !price) {
            return res.status(400).json({ message: "Title and price are required" });
        }

        const newService = await Service.create({
            provider_id: providerId,
            title: title.trim(),
            description: description || "",
            price,
            location: location || ""
        });

        res.status(201).json({
            message: "Service added successfully",
            service: newService
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Search services
export const searchServices = async (req, res) => {
    try {
        const { keyword, location } = req.query;

        const services = await Service.findAll({
            where: {
                title: { [Op.like]: `%${keyword}%` },
                ...(location && { location: { [Op.like]: `%${location}%` } })
            },
            include: [
                {
                    model: User,
                    attributes: ["user_id", "name", "availability_status", "profile_picture"],
                    where: {
                        availability_status: "available",
                        approval_status: "approved"
                    }
                }
            ]
        });

        res.status(200).json(services);
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
};