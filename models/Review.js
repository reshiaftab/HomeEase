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
        allowNull: false,
        validate: {
            min: 1,
            max: 5
        }
    },
    comment: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: ""
    }
}, {
    tableName: "reviews",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
        { fields: ['provider_id'] },
        { fields: ['service_id'] }
    ],
    hooks: {
        beforeCreate: (review) => {
            review.rating = Math.round(review.rating * 10) / 10;
        }
    }
});

// Associations
Review.belongsTo(User, { as: "resident", foreignKey: "resident_id" });
Review.belongsTo(User, { as: "provider", foreignKey: "provider_id" });
Review.belongsTo(Service, { foreignKey: "service_id" });

export default Review;