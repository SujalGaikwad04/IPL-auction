const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ipl_auction',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test connection
pool.getConnection()
  .then((conn) => {
    console.log('🔗 Connected to MySQL database');
    conn.release();
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MySQL database:', err);
  });

module.exports = {
  query: async (text, params) => {
    // Replace PostgreSQL $1, $2 parameter placeholders with MySQL ? placeholders
    const formattedText = text.replace(/\$\d+/g, '?');
    const [rows, fields] = await pool.execute(formattedText, params);
    return { rows, fields };
  },
  pool,
};
