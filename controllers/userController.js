import User from "../models/User.js";

export const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findByPk(userId, {
            attributes: [
                "user_id",
                "name",
                "email",
                "phone",
                "role",
                "profile_picture",
                "approval_status",
                "availability_status"
            ]
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(200).json(user);

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, phone } = req.body;

        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        if (name && name.trim().length < 3) {
            return res.status(400).json({
                message: "Name must be at least 3 characters long"
            });
        }

        if (phone && phone.length < 10) {
            return res.status(400).json({
                message: "Phone number must be at least 10 digits"
            });
        }

        user.name = name ? name.trim() : user.name;
        user.phone = phone || user.phone;

        if (req.file) {
            user.profile_picture = req.file.filename;
        }

        await user.save();

        res.status(200).json({
            message: "Profile updated successfully",
            user: {
                user_id: user.user_id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                profile_picture: user.profile_picture
            }
        });

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
};