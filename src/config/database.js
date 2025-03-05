const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
    'sancity',
    'root',
    process.env.DB_PASS,
     {
       host: 'localhost',
       dialect: 'mysql'
     }
   );
sequelize.authenticate().then(() => {
    console.log("Connected to database");
}).catch(() => {
    console.log("Couldn't connect to database!");
});

exports.sequelize = sequelize;