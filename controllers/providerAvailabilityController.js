import ProviderAvailability from "../models/ProviderAvailability.js";

// Add/Update Availability
export const setAvailability = async (req, res) => {
    try {
        const providerId = req.user.id;
        const { day_of_week, start_time, end_time } = req.body;

        // Validate input
        if(!day_of_week || !start_time || !end_time){
            return res.status(400).json({ message: "All fields are required" });
        }

        const validDays = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
        if (!validDays.includes(day_of_week)) {
            return res.status(400).json({ message: "Invalid day_of_week" });
        }

        if (start_time >= end_time) {
            return res.status(400).json({ message: "start_time must be before end_time" });
        }

        // Delete existing slot for the same day
        await ProviderAvailability.destroy({ where: { provider_id: providerId, day_of_week } });

        const newSlot = await ProviderAvailability.create({
            provider_id: providerId,
            day_of_week,
            start_time,
            end_time
        });

        res.status(201).json({ message: "Availability updated", slot: newSlot });
    } catch(err){
        res.status(500).json({ error: err.message });
    }
};

// Get provider availability
export const getProviderAvailability = async (req, res) => {
    try{
        const providerId = parseInt(req.params.providerId);
        if (isNaN(providerId)) return res.status(400).json({ message: "Invalid provider ID" });

        const slots = await ProviderAvailability.findAll({
            where: { provider_id: providerId }
        });

        res.status(200).json(slots);
    } catch(err){
        res.status(500).json({ error: err.message });
    }
};