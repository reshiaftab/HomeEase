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
                "availability_status",
                "province",
                "city",
                "provider_address"
            ]
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, phone, provider_address } = req.body;

        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (name && name.trim().length < 3) {
            return res.status(400).json({ message: "Name must be at least 3 characters long" });
        }

        if (phone && !/^\d{10,}$/.test(phone)) {
            return res.status(400).json({ message: "Phone must be at least 10 digits and numeric" });
        }

        if (provider_address && provider_address.trim().length < 5) {
            return res.status(400).json({ message: "Provider address must be at least 5 characters long" });
        }

        user.name = name ? name.trim() : user.name;
        user.phone = phone || user.phone;

        if (user.role === "provider" && provider_address !== undefined) {
            user.provider_address = provider_address.trim();
        }

        if (req.file) {
            user.profile_picture = req.file.filename;
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: {
                user_id: user.user_id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                profile_picture: user.profile_picture,
                province: user.province,
                city: user.city,
                provider_address: user.provider_address
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};