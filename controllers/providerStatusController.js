import User from "../models/User.js";
import ProviderAvailability from "../models/ProviderAvailability.js";

// Map JS getDay() (0=Sun..6=Sat) to the backend day_of_week codes.
const jsDayToCode = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * PUT /api/providers/status
 * Body: { availability_status: "available" | "unavailable" }
 *
 * Providers may only go ONLINE ("available") while within a working-hours
 * slot they have set for the current day. Going offline is always allowed.
 * Residents see availability_status via provider recommendations; booking is
 * blocked for unavailable providers (see bookingController).
 */
export const updateProviderStatus = async (req, res) => {
    try {
        const providerId = req.user.id;
        const requested = (req.body.availability_status || "").toString().trim().toLowerCase();

        if (!["available", "unavailable"].includes(requested)) {
            return res.status(400).json({
                message: "availability_status must be 'available' or 'unavailable'"
            });
        }

        const provider = await User.findByPk(providerId);
        if (!provider) {
            return res.status(404).json({ message: "Provider not found" });
        }

        // Going offline is always permitted.
        if (requested === "unavailable") {
            provider.availability_status = "unavailable";
            await provider.save();
            return res.status(200).json({
                success: true,
                message: "You are now offline",
                availability_status: provider.availability_status
            });
        }

        // Going online: enforce working hours for the current day.
        const now = new Date();
        const todayCode = jsDayToCode[now.getDay()];
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const slots = await ProviderAvailability.findAll({
            where: { provider_id: providerId, day_of_week: todayCode }
        });

        const toMinutes = (t) => {
            // TIME columns come back as "HH:MM:SS" (or a Date on some dialects).
            if (!t) return null;
            const parts = t.toString().split(":");
            if (parts.length < 2) return null;
            const h = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            if (isNaN(h) || isNaN(m)) return null;
            return h * 60 + m;
        };

        const withinHours = slots.some((s) => {
            const start = toMinutes(s.start_time);
            const end = toMinutes(s.end_time);
            if (start === null || end === null) return false;
            return currentMinutes >= start && currentMinutes < end;
        });

        if (!withinHours) {
            return res.status(400).json({
                success: false,
                message: "You can only go online during your set availability hours for today. Please set your working hours first."
            });
        }

        provider.availability_status = "available";
        await provider.save();

        return res.status(200).json({
            success: true,
            message: "You are now online",
            availability_status: provider.availability_status
        });
    } catch (err) {
        console.error("Update provider status error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};
