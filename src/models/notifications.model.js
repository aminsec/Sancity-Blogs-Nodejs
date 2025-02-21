const { sequelize } = require("../config/database");
const { DataTypes } = require("sequelize");

//Defining table
const notificationsTB = sequelize.define("notifications", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
    },

    userid: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    acted_userid: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    action_name: {
        type: DataTypes.STRING,
        allowNull: false
    },

    blog_id: {
        type: DataTypes.INTEGER
    },

    comment_id: {
        type: DataTypes.INTEGER
    },

    seen: {
        type: DataTypes.TINYINT,
        allowNull: false
    },

    timestamp: {
        type: DataTypes.STRING,
        allowNull: false
    },

    notif_title: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    timestamps: false
});

//Syncing table
notificationsTB.sync();

exports.notificationsTB = notificationsTB;