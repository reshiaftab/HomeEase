import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";
import User from "./User.js";
import Service from "./Service.js";

const Booking = sequelize.define("Booking", {
    booking_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    resident_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    provider_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    service_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    booking_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    booking_time: {
        type: DataTypes.TIME,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM("pending", "accepted", "completed", "rejected"),
        defaultValue: "pending"
    }
}, {
    tableName: "bookings",
    createdAt: "created_at",   // map Sequelize createdAt to your column
    updatedAt: "updated_at",   // map Sequelize updatedAt to your column
    timestamps: true
});

// Associations
Booking.belongsTo(User, { as: "resident", foreignKey: "resident_id" });
Booking.belongsTo(User, { as: "provider", foreignKey: "provider_id" });
Booking.belongsTo(Service, { foreignKey: "service_id" });

export default Booking;