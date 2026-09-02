import ProviderAvailability from "../models/ProviderAvailability.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import { Op } from "sequelize";

// JS getDay() (0=Sun..6=Sat) -> day_of_week code.
const jsDayToCode = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toMinutes(value) {
    if (!value) return null;
    const parts = value.toString().split(":");
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
}

function toHHMM(totalMinutes) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * GET /api/providers/:providerId/slots?date=YYYY-MM-DD
 *
 * Returns the provider's working-hours window for that weekday and the list
 * of 30-minute bookable slots, marking each slot as "booked" when a confirmed
 * (pending/accepted) booking already occupies it and "past" when the slot is
 * earlier than now (today only).
 */
export const getProviderSlots = async (req, res) => {
    try {
        const providerId = parseInt(req.params.providerId);
        if (isNaN(providerId)) {
            return res.status(400).json({ message: "Invalid provider ID" });
        }

        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ message: "date query param is required (YYYY-MM-DD)" });
        }

        const parsedDate = new Date(date + "T00:00:00");
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ message: "Invalid date" });
        }

        const provider = await User.findByPk(providerId, {
            attributes: ["user_id", "name", "approval_status", "role"],
        });
        if (!provider || provider.role !== "provider") {
            return res.status(404).json({ message: "Provider not found" });
        }

        const dayCode = jsDayToCode[parsedDate.getDay()];

        // Working window for that weekday (provider may have one slot per day).
        const window = await ProviderAvailability.findOne({
            where: { provider_id: providerId, day_of_week: dayCode },
        });

        if (!window) {
            return res.status(200).json({
                success: true,
                date,
                day_of_week: dayCode,
                is_working_day: false,
                start_time: null,
                end_time: null,
                slots: [],
                message: "Provider is not available on this day",
            });
        }

        // Snap the working window to 30-minute boundaries so every bookable
        // slot starts on :00/:30 (providers may set arbitrary times).
        const rawStart = toMinutes(window.start_time);
        const rawEnd = toMinutes(window.end_time);
        const startMin = Math.ceil(rawStart / 30) * 30;
        const endMin = Math.floor(rawEnd / 30) * 30;

        // Build 30-minute slots from start up to (but not including) end.
        const slots = [];
        for (let t = startMin; t + 30 <= endMin; t += 30) {
            slots.push({
                time: toHHMM(t),
                start: toHHMM(t),
                end: toHHMM(t + 30),
                booking_time: `${toHHMM(t)}:00`,
            });
        }

        // Existing bookings for this provider on this date that occupy a slot.
        const bookings = await Booking.findAll({
            where: {
                provider_id: providerId,
                booking_date: date,
                status: { [Op.in]: ["pending", "accepted"] },
            },
            attributes: ["booking_id", "booking_time", "status"],
        });

        const bookedTimes = new Set();
        for (const b of bookings) {
            const min = toMinutes(b.booking_time);
            if (min !== null) bookedTimes.add(toHHMM(min));
        }

        // Determine "past" for today ONLY. Use LOCAL date strings (never
        // toISOString(), which is UTC and would wrongly match a local date to
        // "today" for users east of GMT — e.g. Pakistan UTC+5).
        const localDateStr = (d) =>
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const now = new Date();
        const isToday = localDateStr(now) === date;
        const nowMinutes = now.getHours() * 60 + now.getMinutes();

        const result = slots.map((s) => {
            const slotMin = toMinutes(s.start);
            const booked = bookedTimes.has(s.start);
            const past = isToday && slotMin < nowMinutes;
            return {
                ...s,
                booked,
                past,
                available: !booked && !past,
            };
        });

        return res.status(200).json({
            success: true,
            date,
            day_of_week: dayCode,
            is_working_day: true,
            start_time: toHHMM(startMin),
            end_time: toHHMM(endMin),
            slots: result,
        });
    } catch (error) {
        console.error("Get provider slots error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
