import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";
import User from "./User.js";
import Booking from "./Booking.js";

const ProviderAvailability = sequelize.define("ProviderAvailability", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    provider_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    day_of_week: {
        type: DataTypes.ENUM('Mon','Tue','Wed','Thu','Fri','Sat','Sun'),
        allowNull: false
    },
    start_time: {
        type: DataTypes.TIME,
        allowNull: false
    },
    end_time: {
        type: DataTypes.TIME,
        allowNull: false
    }
}, {
    tableName: "provider_availability",
    timestamps: true
});

// Association
ProviderAvailability.belongsTo(User, { foreignKey: 'provider_id' });
ProviderAvailability.hasMany(Booking, { foreignKey: 'provider_id' });

export default ProviderAvailability;