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
                // LOCAL date (not UTC toISOString) so Pakistan (UTC+5) dates
                // aren't compared against a date that is still "yesterday" in
                // Greenwich.
                const n = new Date();
                const today = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
                if (String(value) < today) {
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
        type: DataTypes.ENUM("pending", "accepted", "completed", "rejected", "cancelled"),
        defaultValue: "pending"
    },
    // ---- Hourly-billing / job-timer fields ----
    // When the provider pressed "Start Timer" (an accepted job is in progress).
    started_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
    },
    // Total tracked work time in seconds (set when the job is completed).
    work_duration_seconds: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null
    },
    // Final billed amount = rounded hours * provider's hourly rate.
    final_amount: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: null
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