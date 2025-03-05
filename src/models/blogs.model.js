const { sequelize } = require("../config/database");
const { DataTypes, TEXT } = require("sequelize");

//Defining table
const blogsTB = sequelize.define("blogs", {
    blog_content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },

    blog_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    blog_image: {
        type: DataTypes.STRING,
        defaultValue: "/api/v1/profilePics/defaultBanner.jpg"
    },

    blog_thumbnail: {
        type: DataTypes.STRING,
        defaultValue: "/api/v1/profilePics/default-thumbnail.jpg",
        allowNull: false
    },

    blog_title: {
        type: DataTypes.STRING,
        allowNull: false,
    },

    is_public: {
        type: DataTypes.TINYINT,
        allowNull: false,
    },

    userid: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    isCommentOff: {
        type: DataTypes.TINYINT,
        allowNull: false
    },
    showLikes: {
        type: DataTypes.TINYINT,
        allowNull: false
    },
    likes: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    createdAt: {
        type: DataTypes.STRING,
        defaultValue: "1726745639519"
    },

    blog_magicToken: {
        type: DataTypes.STRING,
        defaultValue: null
    },

    magicToken_exp: {
        type: DataTypes.STRING,
        defaultValue: "0"
    },

    tags: {
        type: DataTypes.STRING
    }
}, {
    timestamps: false
});

//Syncing table
blogsTB.sync();

exports.blogsTB = blogsTB;