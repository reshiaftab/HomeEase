import { DataTypes } from "sequelize";

import sequelize from "../config/sequelize.js";

import User from "./User.js";


const Notification = sequelize.define("Notification", {


    id: {

        type: DataTypes.INTEGER,

        autoIncrement: true,

        primaryKey: true

    },


    user_id: {

        type: DataTypes.INTEGER,

        allowNull: false

    },


    type: {

        type: DataTypes.ENUM(
            "booking",
            "approval",
            "registration",
            "review",
            "general"
        ),

        allowNull: false,

        defaultValue: "general"

    },


    message: {

        type: DataTypes.TEXT,

        allowNull: false,

        validate: {

            notEmpty:true

        }

    },


    is_read: {

        type: DataTypes.BOOLEAN,

        defaultValue:false

    }


}, {


    tableName:"notifications",


    timestamps:true,


    createdAt:"created_at",


    updatedAt:"updated_at",


    indexes:[


        {
            fields:[
                "user_id"
            ]
        },


        {
            fields:[
                "is_read"
            ]
        },


        {
            fields:[
                "type"
            ]
        }


    ],


    hooks:{


        beforeCreate:(notification)=>{


            if(notification.message){

                notification.message =
                    notification.message.trim();

            }


        }


    }


});




// =========================
// Associations
// =========================

Notification.belongsTo(User,{

    foreignKey:"user_id"

});


export default Notification;