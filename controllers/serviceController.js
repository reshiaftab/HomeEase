import Service from "../models/Service.js";
import User from "../models/User.js";

export const searchServices = async (req, res) => {
    try {

        const { keyword, location } = req.query;

        const services = await Service.findAll({

            where: {
                title: keyword
            },

            include: [
                {
                    model: User,
                    attributes: ["user_id", "name", "availability_status"],
                    where: {
                        availability_status: "available",
                        approval_status: "approved"
                    }
                }
            ]

        });

        res.json(services);

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
};