const { sequelize } = require("../config/database");
const { DataTypes } = require("sequelize");

//Defining table
const dead_sessionsTB = sequelize.define("dead_sessions", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    session: {
        type: DataTypes.STRING
    },

    timestamp: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    timestamps: false
});

//Syncing table
dead_sessionsTB.sync();

exports.dead_sessionsTB = dead_sessionsTB;