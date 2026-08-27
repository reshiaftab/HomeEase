import User from "../models/User.js";
import Service from "../models/Service.js";
import Booking from "../models/Booking.js";
import Review from "../models/Review.js";

import { createNotification } from "./notificationController.js";

import { 
    Op,
    fn,
    col
} from "sequelize";



// =========================
// Get all pending providers
// =========================

export const getPendingProviders = async (req, res) => {

    try {

        const pendingProviders = await User.findAll({

            where: {
                role: "provider",
                approval_status: "pending"
            }

        });


        res.status(200).json(pendingProviders);


    } catch(error) {

        res.status(500).json({
            error:error.message
        });

    }

};


// ==================================================
// Get All Bookings
// ==================================================

export const getAllBookings = async(req,res)=>{

    try{

        const {
            search,
            status,
            category
        } = req.query;



        let bookingWhere = {};



        if(status){

            bookingWhere.status = status;

        }



        const bookings = await Booking.findAll({

            where:bookingWhere,


            include:[


                {
                    model:User,
                    as:"resident",
                    attributes:[
                        "user_id",
                        "name",
                        "email"
                    ]
                },


                {
                    model:User,
                    as:"provider",
                    attributes:[
                        "user_id",
                        "name",
                        "email"
                    ]
                },


                {
                    model:Service,
                    where: category ? {

                        title:{
                            [Op.like]:`%${category}%`
                        }

                    }:undefined,

                    attributes:[
                        "service_id",
                        "title"
                    ]
                }


            ],


            order:[
                [
                    "created_at",
                    "DESC"
                ]
            ]

        });




        let result = bookings;



        if(search){

            result = bookings.filter((booking)=>{


                return (

                    booking.booking_id
                    .toString()
                    .includes(search)

                    ||

                    booking.resident?.name
                    .toLowerCase()
                    .includes(search.toLowerCase())

                    ||

                    booking.provider?.name
                    .toLowerCase()
                    .includes(search.toLowerCase())

                );


            });


        }





        res.status(200).json({

            success:true,

            bookings:result

        });



    }catch(error){


        res.status(500).json({

            success:false,

            error:error.message

        });

    }

};

// ==================================================
// Get Reviews & Ratings
// ==================================================

export const getAdminReviews = async(req,res)=>{


    try{


        const reviews = await Review.findAll({

            include:[


                {
                    model:User,
                    as:"resident",
                    attributes:[
                        "name"
                    ]
                },


                {
                    model:User,
                    as:"provider",
                    attributes:[
                        "name"
                    ]
                },


                {
                    model: Service,
                    as: "service",
                    attributes:[
                    "title"
                    ]
                }


            ],


            order:[
                [
                    "created_at",
                    "DESC"
                ]
            ]

        });



        res.status(200).json({

            success:true,

            reviews

        });



    }catch(error){


        res.status(500).json({

            success:false,

            error:error.message

        });

    }


};

// =========================
// Get All Service Providers
// =========================

export const getAllProviders = async(req,res)=>{

    try{


        const { search, status } = req.query;



        let whereCondition = {

            role:"provider"

        };



        if(status){

            whereCondition.approval_status = status;

        }



        if(search){

            whereCondition[Op.or] = [

                {
                    name:{
                        [Op.like]:`%${search}%`
                    }
                },

                {
                    email:{
                        [Op.like]:`%${search}%`
                    }
                },

                {
                    phone:{
                        [Op.like]:`%${search}%`
                    }
                }

            ];

        }




        const providers = await User.findAll({

            where:whereCondition,


            attributes:[

                "user_id",
                "name",
                "email",
                "phone",
                "availability_status",
                "approval_status"

            ],



            include:[

                {

                    model:Service,

                    as:"services",

                    attributes:[

                        "title"

                    ],

                    required:false

                },


                {

                    model:Review,

                    as:"reviews",

                    attributes:[

                        [
                            fn(
                                "AVG",
                                col("reviews.rating")
                            ),
                            "average_rating"
                        ]

                    ],

                    required:false

                }


            ],


            group:[

                "User.user_id",
                "services.service_id"

            ]

        });





        const result = providers.map(provider=>({


            provider_id:
                provider.user_id,


            name:
                provider.name,


            email:
                provider.email,


            phone:
                provider.phone,


            service:
                provider.services?.[0]?.title || "N/A",



            rating:
                Number(
                    provider.reviews?.[0]?.get("average_rating")
                ) || 0,



            status:
                provider.availability_status,



            approval_status:
                provider.approval_status


        }));




        res.status(200).json({

            success:true,

            providers:result

        });



    }catch(error){


        console.error(error);


        res.status(500).json({

            success:false,

            error:error.message

        });


    }

};







// =========================
// Approve Provider
// =========================

export const approveProvider = async (req,res)=>{


    const providerId = parseInt(req.params.providerId);



    if(isNaN(providerId)){

        return res.status(400).json({

            message:"Invalid provider ID"

        });

    }



    try{


        const provider = await User.findByPk(providerId);



        if(!provider || provider.role !== "provider"){

            return res.status(404).json({

                message:"Provider not found"

            });

        }



        provider.approval_status="approved";


        await provider.save();




        createNotification(

            provider.user_id,

            "approval",

            "Your account has been approved by admin."

        ).catch(console.error);





        res.status(200).json({

            message:"Provider approved",

            provider:{

                id:provider.user_id,

                name:provider.name,

                email:provider.email

            }

        });



    }catch(error){


        res.status(500).json({

            error:error.message

        });

    }


};








// =========================
// Reject Provider
// =========================

export const rejectProvider = async(req,res)=>{


    const providerId=parseInt(req.params.providerId);



    if(isNaN(providerId)){

        return res.status(400).json({

            message:"Invalid provider ID"

        });

    }




    try{


        const provider = await User.findByPk(providerId);



        if(!provider || provider.role!=="provider"){

            return res.status(404).json({

                message:"Provider not found"

            });

        }




        provider.approval_status="rejected";


        await provider.save();




        createNotification(

            provider.user_id,

            "approval",

            "Your account has been rejected by admin."

        ).catch(console.error);




        res.status(200).json({

            message:"Provider rejected",

            provider:{

                id:provider.user_id,

                name:provider.name,

                email:provider.email

            }

        });



    }catch(error){


        res.status(500).json({

            error:error.message

        });

    }


};







// =========================
// Admin Dashboard Summary
// =========================

export const getAdminDashboard = async(req,res)=>{


    try{


        const totalUsers = await User.count();



        const totalResidents = await User.count({

            where:{
                role:"resident"
            }

        });



        const totalProviders = await User.count({

            where:{
                role:"provider"
            }

        });



        const approvedProviders = await User.count({

            where:{

                role:"provider",

                approval_status:"approved"

            }

        });



        const pendingProviders = await User.count({

            where:{

                role:"provider",

                approval_status:"pending"

            }

        });




        res.status(200).json({

            success:true,

            dashboard:{

                totalUsers,

                totalResidents,

                totalProviders,

                approvedProviders,

                pendingProviders

            }

        });



    }catch(error){


        res.status(500).json({

            success:false,

            error:error.message

        });

    }


};









// ==================================================
// Manage Residents
// ==================================================



// Get all residents

export const getResidents = async(req,res)=>{


    try{


        const {search}=req.query;



        let whereCondition={

            role:"resident"

        };




        if(search){


            whereCondition={

                role:"resident",

                [Op.or]:[

                    {

                        name:{

                            [Op.like]:`%${search}%`

                        }

                    },

                    {

                        email:{

                            [Op.like]:`%${search}%`

                        }

                    },

                    {

                        phone:{

                            [Op.like]:`%${search}%`

                        }

                    }

                ]

            };

        }





        const residents = await User.findAll({

            where:whereCondition,


            attributes:[

                "user_id",

                "name",

                "email",

                "phone",

                "created_at"

            ],


            order:[

                [
                    "created_at",
                    "DESC"
                ]

            ]

        });





        res.status(200).json({

            success:true,

            residents

        });




    }catch(error){


        res.status(500).json({

            success:false,

            error:error.message

        });

    }


};








// Delete resident

export const deleteResident = async(req,res)=>{


    try{


        const residentId=parseInt(req.params.residentId);



        if(isNaN(residentId)){

            return res.status(400).json({

                message:"Invalid resident ID"

            });

        }




        const resident=await User.findOne({

            where:{

                user_id:residentId,

                role:"resident"

            }

        });





        if(!resident){

            return res.status(404).json({

                message:"Resident not found"

            });

        }





        await resident.destroy();




        res.status(200).json({

            success:true,

            message:"Resident deleted successfully"

        });



    }catch(error){


        res.status(500).json({

            success:false,

            error:error.message

        });

    }


};