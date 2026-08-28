import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";

const User = sequelize.define("User", {

    user_id: {
        type: DataTypes.INTEGER,
        autoIncrement:true,
        primaryKey:true
    },


    name:{
        type:DataTypes.STRING(100),
        allowNull:false
    },


    email:{
        type:DataTypes.STRING(100),
        allowNull:false,

        validate:{
            isEmail:true
        }
    },


    password:{
        type:DataTypes.STRING(255),
        allowNull:false
    },


    phone:{
        type:DataTypes.STRING(20),
        allowNull:false,

        validate:{
            len:[10,20]
        }
    },


    role:{
        type:DataTypes.ENUM(
            "resident",
            "provider",
            "admin"
        ),

        allowNull:false,

        defaultValue:"resident"
    },


    profile_picture:{
        type:DataTypes.STRING(255),
        allowNull:true,
        defaultValue:null
    },


    police_certificate:{
        type:DataTypes.STRING(255),
        allowNull:true,
        defaultValue:null
    },


    professional_certificate:{
        type:DataTypes.STRING(255),
        allowNull:true,
        defaultValue:null
    },


    cnic:{
        type:DataTypes.STRING(20),
        allowNull:true
    },


    province:{
        type:DataTypes.STRING(50),
        allowNull:true
    },


    city:{
        type:DataTypes.STRING(50),
        allowNull:true
    },


    service_category:{
        type:DataTypes.STRING(50),
        allowNull:true
    },


    availability_status:{
        type:DataTypes.ENUM(
            "available",
            "unavailable"
        ),

        allowNull:false,

        defaultValue:"available"
    },


    approval_status:{
        type:DataTypes.ENUM(
            "pending",
            "approved",
            "rejected"
        ),

        allowNull:false,

        defaultValue:"approved"
    },


    submitted_at:{
        type:DataTypes.DATE,
        allowNull:true
    },


    reset_password_token:{
        type:DataTypes.STRING,
        allowNull:true
    },


    reset_password_expires:{
        type:DataTypes.DATE,
        allowNull:true
    }


},{

    tableName:"users",


    timestamps:true,


    createdAt:"created_at",


    updatedAt:false,


    indexes:[


        // Unique indexes
        {
            unique:true,
            fields:[
                "email"
            ]
        },


        {
            unique:true,
            fields:[
                "cnic"
            ]
        },


        // Normal indexes
        {
            fields:[
                "role"
            ]
        },


        {
            fields:[
                "approval_status"
            ]
        },


        {
            fields:[
                "service_category"
            ]
        }


    ],


    hooks:{


        beforeCreate:(user)=>{


            if(user.email){

                user.email =
                user.email.toLowerCase();

            }


        }


    }

});


export default User;