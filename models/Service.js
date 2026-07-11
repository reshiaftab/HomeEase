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
        allowNull: false,
        validate: { notEmpty: true }
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: ""
    },
    price: {
        type: DataTypes.FLOAT,
        allowNull: false,
        validate: { min: 0 }
    },
    location: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: ""
    }
}, {
    tableName: "services",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
        { fields: ['provider_id'] },
        { fields: ['title'] }
    ],
    hooks: {
        beforeCreate: (service) => {
            if (service.title) service.title = service.title.trim();
            if (service.location) service.location = service.location.trim();
        }
    }
});

// Associations
Service.belongsTo(User, { foreignKey: "provider_id" });

export default Service;