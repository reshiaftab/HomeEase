import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";
import User from "./User.js";

const ChatMessage = sequelize.define("ChatMessage", {
    message_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    booking_id: { type: DataTypes.INTEGER, allowNull: false },
    sender_id: { type: DataTypes.INTEGER, allowNull: false },
    receiver_id: { type: DataTypes.INTEGER, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false }
}, {
    tableName: "chat_messages",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false
});

ChatMessage.belongsTo(User, { as: "sender", foreignKey: "sender_id" });
ChatMessage.belongsTo(User, { as: "receiver", foreignKey: "receiver_id" });

export default ChatMessage;