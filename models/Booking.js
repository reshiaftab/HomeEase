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
    latitude: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    longitude: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    service_address: {
    type: DataTypes.STRING(255),
    allowNull: false
    },

    additional_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: ""
    },
    booking_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            isValid(value) {
                const today = new Date().toISOString().split('T')[0];
                if (value < today) {
                    throw new Error("booking_date cannot be in the past");
                }
            }
        }
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
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
        { fields: ['provider_id'] },
        { fields: ['resident_id'] },
        { fields: ['booking_date'] }
    ]
});

// Associations
Booking.belongsTo(User, { as: "resident", foreignKey: "resident_id" });
Booking.belongsTo(User, { as: "provider", foreignKey: "provider_id" });
Booking.belongsTo(Service, { foreignKey: "service_id" });

export default Booking;