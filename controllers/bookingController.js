import Booking from "../models/Booking.js";
import ProviderAvailability from "../models/ProviderAvailability.js";
import Service from "../models/Service.js";
import User from "../models/User.js";
import { Op } from "sequelize";
import { createNotification } from "./notificationController.js";


// =========================
// Get Admin User
// =========================

const getAdmin = async () => {

    return await User.findOne({
        where:{
            role:"admin"
        }
    });

};



// =========================
// Create Booking with availability check
// =========================

export const createBooking = async (req, res) => {

    try {

        const residentId = req.user.id;


        const { 
            service_id, 
            booking_date, 
            booking_time, 
            latitude, 
            longitude 
        } = req.body;



        if (
            !service_id || 
            !booking_date || 
            !booking_time || 
            latitude == null || 
            longitude == null
        ) {

            return res.status(400).json({
                message:
                "service_id, booking_date, booking_time, latitude, and longitude are required"
            });

        }



        const service = await Service.findByPk(service_id);


        if (!service) {

            return res.status(404).json({
                message:"Service not found"
            });

        }



        const providerId = service.provider_id;



        const dayOfWeek =
        new Date(booking_date)
        .toLocaleString(
            'en-US',
            {
                weekday:'short'
            }
        );




        const availableSlot =
        await ProviderAvailability.findOne({

            where:{

                provider_id:providerId,

                day_of_week:dayOfWeek,

                start_time:{
                    [Op.lte]:booking_time
                },

                end_time:{
                    [Op.gte]:booking_time
                }

            }

        });



        if(!availableSlot){

            return res.status(400).json({

                message:
                "Provider is not available at this time"

            });

        }




        const existingBooking =
        await Booking.findOne({

            where:{

                provider_id:providerId,

                booking_date,

                booking_time

            }

        });



        if(existingBooking){

            return res.status(400).json({

                message:
                "This time slot is already booked"

            });

        }






        const newBooking =
        await Booking.create({

            resident_id:residentId,

            service_id,

            provider_id:providerId,

            booking_date,

            booking_time,

            latitude,

            longitude,

            status:"pending"

        });






        // Provider notification

        await createNotification(

            providerId,

            "booking",

            `New booking request for ${booking_date} at ${booking_time}`

        );





        // Resident notification

        await createNotification(

            residentId,

            "booking",

            `Your booking request for ${booking_date} at ${booking_time} has been sent to the provider.`

        );





        // Admin notification

        const admin = await getAdmin();


        if(admin){

            await createNotification(

                admin.user_id,

                "booking",

                `New booking request created for ${booking_date} at ${booking_time}.`

            );

        }






        const bookingDetails =
        await Booking.findByPk(

            newBooking.booking_id,

            {

                include:[

                    {
                        model:Service,

                        attributes:[
                            "title",
                            "description",
                            "price"
                        ]

                    },


                    {

                        model:User,

                        as:"provider",

                        attributes:[
                            "name",
                            "email",
                            "phone"
                        ]

                    }

                ]

            }

        );






        res.status(201).json({

            message:
            "Booking created successfully",

            booking:
            bookingDetails

        });




    } catch(error){

        res.status(500).json({

            error:error.message

        });

    }

};









// =========================
// View my bookings
// =========================

export const getMyBookings = async(req,res)=>{

    try{


        const userId=req.user.id;

        const role=req.user.role;


        let bookings;



        if(role==="resident"){


            bookings =
            await Booking.findAll({

                where:{
                    resident_id:userId
                },

                include:[

                    {
                        model:Service,

                        attributes:[
                            "title",
                            "description",
                            "price"
                        ]

                    },

                    {

                        model:User,

                        as:"provider",

                        attributes:[
                            "name",
                            "email",
                            "phone"
                        ]

                    }

                ]

            });



        }
        else if(role==="provider"){


            bookings =
            await Booking.findAll({

                where:{
                    provider_id:userId
                },


                include:[

                    {
                        model:Service,

                        attributes:[
                            "title",
                            "description",
                            "price"
                        ]

                    },

                    {

                        model:User,

                        as:"resident",

                        attributes:[
                            "name",
                            "email",
                            "phone"
                        ]

                    }

                ]

            });



        }
        else{


            return res.status(403).json({

                message:"Invalid role"

            });


        }




        res.status(200).json(bookings);



    }catch(error){


        res.status(500).json({

            error:error.message

        });

    }

};









// =========================
// Update booking status
// =========================

export const updateBookingStatus = async(req,res)=>{


    try{


        const providerId=req.user.id;


        const {
            bookingId
        } = req.params;


        const {
            status
        } = req.body;





        const validStatus=[

            "pending",

            "accepted",

            "completed",

            "rejected"

        ];



        if(!validStatus.includes(status)){


            return res.status(400).json({

                message:"Invalid status value"

            });

        }






        const booking =
        await Booking.findByPk(bookingId);





        if(
            !booking ||
            booking.provider_id !== providerId
        ){

            return res.status(404).json({

                message:
                "Booking not found or not authorized"

            });

        }







        booking.status=status;


        await booking.save();







        // Resident notification

        await createNotification(

            booking.resident_id,

            "booking",

            `Your booking status has been updated to "${status}" by the provider.`

        );







        // Admin notification

        const admin =
        await getAdmin();




        if(admin){


            let message;



            if(status==="accepted"){


                message =
                `Booking #${booking.booking_id} has been accepted by provider.`;

            }


            else if(status==="completed"){


                message =
                `Booking #${booking.booking_id} has been completed.`;

            }


            else if(status==="rejected"){


                message =
                `Booking #${booking.booking_id} has been rejected by provider.`;

            }


            else{


                message =
                `Booking #${booking.booking_id} status changed to ${status}.`;

            }





            await createNotification(

                admin.user_id,

                "booking",

                message

            );


        }






        res.status(200).json({

            message:
            "Booking status updated successfully"

        });





    }catch(error){


        res.status(500).json({

            error:error.message

        });


    }

};