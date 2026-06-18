import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";
import User from "./User.js";

const Service = sequelize.define("Service", {
    service_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    provider_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    title: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    price: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    location: {
        type: DataTypes.STRING(100),
        allowNull: true
    }
}, {
    tableName: "services",
    timestamps: true
});

// Associate service with provider (User)
Service.belongsTo(User, { foreignKey: "provider_id" });

export default Service;