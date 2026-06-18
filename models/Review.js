import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";
import User from "./User.js";
import Service from "./Service.js";


const Review = sequelize.define("Review", {
    review_id: {
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
    rating: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    comment: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: "reviews",
    timestamps: true
});

// Associations
Review.belongsTo(User, { as: "resident", foreignKey: "resident_id" });
Review.belongsTo(User, { as: "provider", foreignKey: "provider_id" });
Review.belongsTo(Service, { foreignKey: "service_id" });

export default Review;