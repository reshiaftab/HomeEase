import Review from "../models/Review.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";

// Add Review
export const addReview = async (req, res) => {
    try {
        const residentId = req.user.id;
        const { booking_id, rating, comment } = req.body;

        if (!booking_id || !rating) {
            return res.status(400).json({ message: "booking_id and rating are required" });
        }

        // Find booking and provider
        const booking = await Booking.findOne({
            where: { booking_id, resident_id: residentId }
        });

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        const providerId = booking.provider_id;

        // Create review
        const newReview = await Review.create({
            booking_id,
            resident_id: residentId,
            provider_id: providerId,
            rating,
            comment
        });

        res.status(201).json({
            message: "Review added successfully",
            review: newReview
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get Provider Reviews
export const getProviderReviews = async (req, res) => {
    try {
        const providerId = parseInt(req.params.providerId);
        if (isNaN(providerId)) return res.status(400).json({ message: "Invalid provider ID" });

        const reviews = await Review.findAll({
            where: { provider_id: providerId },
            include: [
                { model: User, as: "resident", attributes: ["name"] }
            ],
            order: [["created_at", "DESC"]]
        });

        const result = reviews.map(r => ({
            review_id: r.review_id,
            rating: r.rating,
            comment: r.comment,
            created_at: r.created_at,
            resident_name: r.resident.name
        }));

        res.status(200).json(result);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};