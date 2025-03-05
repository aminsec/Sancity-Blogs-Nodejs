const { sequelize } = require("../config/database");
const { DataTypes } = require("sequelize");

//Defining table
const commentsTB = sequelize.define("comments", {
    blog_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },

    comment_text: {
        type: DataTypes.STRING,
        allowNull: false,
    },

    commentedAt: {
        type: DataTypes.STRING,
        defaultValue: "1726745639519",
        allowNull: false,
    },

    commentLikes: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
    },

    commentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },

    userid: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    timestamps: false
});

//Syncing table
commentsTB.sync();

exports.commentsTB = commentsTB;