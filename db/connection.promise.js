const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

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

async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Kết nối database thành công!');
    connection.release(); // Trả connection về pool
  } catch (err) {
    console.error('❌ Lỗi kết nối database:', err.message);
    process.exit(1); // Dừng app nếu không kết nối được
  }
}

// Gọi hàm test ngay khi load file
testConnection();

module.exports = pool;
