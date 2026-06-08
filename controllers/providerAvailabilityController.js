import ProviderAvailability from "../models/ProviderAvailability.js";

// Add/Update Availability
export const setAvailability = async (req, res) => {
    try {
        const providerId = req.user.id;
        const { day_of_week, start_time, end_time } = req.body;

        if(!day_of_week || !start_time || !end_time){
            return res.status(400).json({ message: "All fields are required" });
        }

        // Optional: delete existing slot for same day
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
        const providerId = req.params.providerId;

        const slots = await ProviderAvailability.findAll({
            where: { provider_id: providerId }
        });

        res.status(200).json(slots);
    } catch(err){
        res.status(500).json({ error: err.message });
    }
};