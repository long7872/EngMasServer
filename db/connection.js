const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config({ path: './server.env' });

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

connection.connect(err => {
  if (err) {
    console.error('❌ Lỗi kết nối database:', err);
    return;
  }
  console.log('✅ Kết nối database thành công!');
});

module.exports = connection;
