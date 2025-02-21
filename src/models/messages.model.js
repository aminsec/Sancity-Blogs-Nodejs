const { sequelize } = require("../config/database");
const { DataTypes, TEXT } = require("sequelize");

//Defining table
const messagesTB = sequelize.define("messages", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
    },

    sender: {
        type: DataTypes.STRING,
        allowNull: false
    },

    receiver: {
        type: DataTypes.STRING,
        allowNull: false
    },

    message: {
        type: TEXT('medium')
    },

    timestamp: {
        type: DataTypes.STRING,
        allowNull: false
    },
}, {
    timestamps: false
});

//Syncing table
messagesTB.sync();

exports.messagesTB = messagesTB;