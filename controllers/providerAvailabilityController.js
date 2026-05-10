import User from "../models/User.js";

export const updateAvailability = async (req, res) => {
    try {

        const providerId = req.user.id;
        const { availability_status } = req.body;

        if (!["available", "unavailable"].includes(availability_status)) {
            return res.status(400).json({
                message: "Invalid availability status"
            });
        }

        const provider = await User.findByPk(providerId);

        if (!provider || provider.role !== "provider") {
            return res.status(404).json({
                message: "Provider not found"
            });
        }

        provider.availability_status = availability_status;

        await provider.save();

        res.status(200).json({
            message: "Availability updated successfully",
            availability_status: provider.availability_status
        });

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
};