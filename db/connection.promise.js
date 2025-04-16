const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
// dotenv.config({ path: './server.env' });
dotenv.config({ path: './server.env' });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;
