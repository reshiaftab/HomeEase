import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";

const User = sequelize.define("User", {
    user_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },

    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },

    password: {
        type: DataTypes.STRING(255),
        allowNull: false
    },

    phone: {
        type: DataTypes.STRING(20),
        allowNull: false
    },

    role: {
        type: DataTypes.ENUM("resident", "provider", "admin"),
        allowNull: false,
        defaultValue: "resident"
    },

    profile_picture: {
    type: DataTypes.STRING(255),
    allowNull: true
    },
    
    police_certificate: {
        type: DataTypes.STRING(255),
        allowNull: true
    },

    professional_certificate: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    
    availability_status: {
    type: DataTypes.ENUM("available", "unavailable"),
    allowNull: false,
    defaultValue: "available"
    },

    approval_status: {
        type: DataTypes.ENUM("pending", "approved", "rejected"),
        allowNull: false,
        defaultValue: "approved"
    },

    submitted_at: {
        type: DataTypes.DATE,
        allowNull: true
    },

    reset_password_token: {
    type: DataTypes.STRING,
    allowNull: true
},
reset_password_expires: {
    type: DataTypes.DATE,
    allowNull: true
}
}, {
    tableName: "users",
    timestamps: false
});

export default User;