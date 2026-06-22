const mysql = require("mysql2");
require("dotenv").config();

let db;

try {
  db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  db.connect((err) => {
    if (err) {
      console.log("Database not connected");
    } else {
      console.log("MySQL Connected");
    }
  });

} catch (error) {
  console.log(error);
}

module.exports = db;
