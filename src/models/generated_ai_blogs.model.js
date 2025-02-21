const { sequelize } = require("../config/database");
const { DataTypes } = require("sequelize");

//Defining table
const generated_ai_blogsTB = sequelize.define("generated_ai_blogs", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
    },

    subject: {
        type: DataTypes.STRING,
        allowNull: false
    },

    createdAt: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    timestamps: false
});

//Syncing table
generated_ai_blogsTB.sync();

exports.generated_ai_blogsTB = generated_ai_blogsTB;