import Booking from "../models/Booking.js";
import User from "../models/User.js";
import Review from "../models/Review.js";
import Service from "../models/Service.js";

import {
    Op,
    fn,
    col
} from "sequelize";



// GET /api/admin/analytics?period=monthly

export const getAdminAnalytics = async(req,res)=>{


try{


const period=req.query.period || "monthly";


const now=new Date();


let startDate;



if(period==="daily"){


    startDate=new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );


}
else if(period==="weekly"){


    const day=now.getDay();


    startDate=new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()-day
    );


}
else{


    startDate=new Date(
        now.getFullYear(),
        now.getMonth(),
        1
    );


}






// Total bookings

const totalBookings = await Booking.count({

    where:{

        created_at:{
            [Op.gte]:startDate
        }

    }

});







// Booking status summary

const bookingsByStatus = await Booking.findAll({

    attributes:[

        "status",

        [
            fn(
                "COUNT",
                col("booking_id")
            ),
            "count"
        ]

    ],

    group:["status"]

});







// Pending providers

const pendingProviders = await User.count({

    where:{

        role:"provider",

        approval_status:"pending"

    }

});








// Users

const totalResidents = await User.count({

    where:{
        role:"resident"
    }

});




const totalApprovedProviders = await User.count({

    where:{

        role:"provider",

        approval_status:"approved"

    }

});







// Services

const totalServices = await Service.count();








// Customer satisfaction

const averageRating = await Review.findOne({

    attributes:[

        [
            fn(
                "AVG",
                col("rating")
            ),
            "average_rating"
        ]

    ],

    raw:true

});







// Most booked services

const mostBookedServices = await Booking.findAll({

    attributes:[

        "service_id",

        [
            fn(
                "COUNT",
                col("Booking.booking_id")
            ),
            "booking_count"
        ]

    ],


    include:[

        {

            model:Service,

            attributes:[
                "title"
            ]

        }

    ],


    group:[

        "service_id",

        "Service.service_id"

    ],


    order:[

        [
            fn(
                "COUNT",
                col("Booking.booking_id")
            ),
            "DESC"
        ]

    ],


    limit:5

});







// Provider activity

const providerActivity = await Booking.findAll({

    attributes:[

        "provider_id",

        [

            fn(
                "COUNT",
                col("booking_id")
            ),

            "total_bookings"

        ]

    ],


    include:[

        {

            model:User,

            as:"provider",

            attributes:[
                "name"
            ]

        }

    ],


    group:[

        "provider_id",

        "provider.user_id"

    ],


    limit:10

});







res.status(200).json({


    success:true,


    period,


    totalBookings,


    bookingsByStatus,


    pendingProviders,


    totalResidents,


    totalApprovedProviders,


    totalServices,


    customerSatisfaction:

        Number(
            averageRating?.average_rating
        ) || 0,



    mostBookedServices,


    providerActivity



});





}catch(error){


res.status(500).json({

    success:false,

    error:error.message

});


}


};