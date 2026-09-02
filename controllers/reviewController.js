import Review from "../models/Review.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import { createNotification } from "./notificationController.js";

// Add Review
export const addReview = async (req, res) => {
    try {
        const residentId = req.user.id;
        const { booking_id, rating, comment } = req.body;

        if (!booking_id || !rating) {
            return res.status(400).json({ message: "booking_id and rating are required" });
        }

        // Find the specific booking belonging to this resident
        const booking = await Booking.findOne({
            where: { booking_id, resident_id: residentId }
        });

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        if (booking.status !== "completed") {
            return res.status(400).json({
                message: "You can only review a completed booking"
            });
        }

        const providerId = booking.provider_id;

        // Create review (service_id comes from the booking — it is required)
        const newReview = await Review.create({
            resident_id: residentId,
            provider_id: providerId,
            service_id: booking.service_id,
            rating,
            comment
        });

        // Real-time notifications to both parties.
        await createNotification(
            providerId,
            "review",
            `You received a ${rating}-star review for booking #${booking_id}.`
        );
        await createNotification(
            residentId,
            "review",
            `Your review for booking #${booking_id} has been submitted.`
        );

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