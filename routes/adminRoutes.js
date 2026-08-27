import express from "express";

import {

    getPendingProviders,
    getAllProviders,
    approveProvider,
    rejectProvider,

    getAdminDashboard,

    getResidents,
    deleteResident,

    getAllBookings,
    getAdminReviews

} from "../controllers/adminController.js";


import authMiddleware from "../middleware/authMiddleware.js";

import roleMiddleware from "../middleware/roleMiddleware.js";


const router = express.Router();



// =========================
// Admin Dashboard
// =========================

router.get(
    "/dashboard",
    authMiddleware,
    roleMiddleware("admin"),
    getAdminDashboard
);





// =========================
// Manage Residents
// =========================


router.get(
    "/residents",
    authMiddleware,
    roleMiddleware("admin"),
    getResidents
);



router.delete(
    "/residents/:residentId",
    authMiddleware,
    roleMiddleware("admin"),
    deleteResident
);






// =========================
// Manage Service Providers
// =========================


router.get(
    "/providers",
    authMiddleware,
    roleMiddleware("admin"),
    getAllProviders
);



router.get(
    "/providers/pending",
    authMiddleware,
    roleMiddleware("admin"),
    getPendingProviders
);



router.put(
    "/providers/:providerId/approve",
    authMiddleware,
    roleMiddleware("admin"),
    approveProvider
);



router.put(
    "/providers/:providerId/reject",
    authMiddleware,
    roleMiddleware("admin"),
    rejectProvider
);







// =========================
// Manage Bookings
// =========================


router.get(
    "/bookings",
    authMiddleware,
    roleMiddleware("admin"),
    getAllBookings
);







// =========================
// Manage Reviews
// =========================


router.get(
    "/reviews",
    authMiddleware,
    roleMiddleware("admin"),
    getAdminReviews
);




export default router;