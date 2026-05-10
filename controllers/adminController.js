import User from "../models/User.js";

// Get all pending providers
export const getPendingProviders = async (req, res) => {
    try {
        const pendingProviders = await User.findAll({
            where: {
                role: "provider",
                approval_status: "pending"
            }
        });

        res.status(200).json(pendingProviders);
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
};

// Approve provider
export const approveProvider = async (req, res) => {
    const { providerId } = req.params;

    try {
        const provider = await User.findByPk(providerId);

        if (!provider || provider.role !== "provider") {
            return res.status(404).json({
                message: "Provider not found"
            });
        }

        provider.approval_status = "approved";
        await provider.save();

        res.status(200).json({
            message: "Provider approved"
        });
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
};

// Reject provider
export const rejectProvider = async (req, res) => {
    const { providerId } = req.params;

    try {
        const provider = await User.findByPk(providerId);

        if (!provider || provider.role !== "provider") {
            return res.status(404).json({
                message: "Provider not found"
            });
        }

        provider.approval_status = "rejected";
        await provider.save();

        res.status(200).json({
            message: "Provider rejected"
        });
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
};