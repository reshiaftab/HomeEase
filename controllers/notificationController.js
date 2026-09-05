import Notification from "../models/Notification.js";

import { getIo, emitToUsers } from "../socket.js";



// =========================
// Create Notification
// =========================

export const createNotification = async (
    user_id,
    type,
    message
)=>{


    try{


        const notification = await Notification.create({

            user_id,

            type,

            message

        });



        // Real-time notification. Emit both globally (legacy) and to the
        // user's personal room so every one of that user's connected clients
        // receives it reliably.
        try{

            const io = getIo();

            io.emit(
                `notification-${user_id}`,
                notification
            );

            emitToUsers(user_id, `notification-${user_id}`, notification);

        }catch(socketError){


            console.log(
                "Socket notification skipped:",
                socketError.message
            );


        }



        return notification;



    }catch(error){


        console.error(
            "Notification creation failed:",
            error.message
        );


    }


};







// =========================
// Get User Notifications
// =========================

export const getUserNotifications = async(req,res)=>{


    try{


        const userId=req.user.id;



        const notifications = await Notification.findAll({

            where:{

                user_id:userId

            },


            order:[

                [
                    "created_at",
                    "DESC"
                ]

            ]

        });



        res.status(200).json({

            success:true,

            notifications

        });



    }catch(error){


        res.status(500).json({

            success:false,

            error:error.message

        });


    }


};







// =========================
// Mark Notification As Read
// =========================

export const markAsRead = async(req,res)=>{


    try{


        const {id}=req.params;



        const notification =
            await Notification.findByPk(id);



        if(!notification){


            return res.status(404).json({

                message:"Notification not found"

            });


        }




        notification.is_read=true;


        await notification.save();




        res.status(200).json({

            success:true,

            message:"Notification marked as read"

        });



    }catch(error){


        res.status(500).json({

            success:false,

            error:error.message

        });


    }


};