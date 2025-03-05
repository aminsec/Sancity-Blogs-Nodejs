const { sequelize } = require("../config/database");
const { DataTypes } = require("sequelize");

//Defining users table
const usersTB = sequelize.define("users", {
    userid: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
    },

    username: {
        type: DataTypes.STRING,
        allowNull: false,
    },

    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },

    email: {
        type: DataTypes.STRING,
        allowNull: false,
    },

    joinDate: {
        type: DataTypes.STRING,
        defaultValue: "1726745639519",
        allowNull: false,
    },

    role: {
        type: DataTypes.STRING,
        allowNull: false,
    },

    likedPosts: {
        type: DataTypes.STRING,
        defaultValue: "0"
    },

    likedComments: {
        type: DataTypes.STRING,
        defaultValue: "0"
    },

    savedPosts: {
        type: DataTypes.STRING,
        defaultValue: "0"
    },
    profilePic: {
        type: DataTypes.STRING,
        defaultValue: "/api/v1/profilePics/ProfileDefault.png"
    },

    bio: {
        type: DataTypes.STRING
    },

    ai_requests: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    timestamps: false
});

//Syncing table
usersTB.sync();

exports.usersTB = usersTB;