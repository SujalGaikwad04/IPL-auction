const { pool } = require('./db');
const { players, teams } = require('./store'); // using the old store file just for seeding data once

async function initializeDatabase() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('📦 Creating database tables...');
    
    // Create tables (MySQL syntax)
    // Note: Multiple statements require multiple queries or allowMultiQueries in pool, 
    // but the safest is executing them sequentially
    const queries = [
      `DROP TABLE IF EXISTS bids`,
      `DROP TABLE IF EXISTS auction_state`,
      `DROP TABLE IF EXISTS squads`,
      `DROP TABLE IF EXISTS players`,
      `DROP TABLE IF EXISTS teams`,
      
      `CREATE TABLE teams (
        code VARCHAR(10) PRIMARY KEY,
        name VARCHAR(100),
        purse DECIMAL(10, 2) DEFAULT 110.00,
        players_bought INT DEFAULT 0,
        total_spent DECIMAL(10, 2) DEFAULT 0
      )`,

      `CREATE TABLE players (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100),
        role VARCHAR(50),
        country VARCHAR(50),
        base_price DECIMAL(10, 2),
        age INT,
        stat1 INT,
        stat1_label VARCHAR(50),
        stat2 INT,
        stat2_label VARCHAR(50),
        stat3 DECIMAL(10, 2),
        stat3_label VARCHAR(50),
        prev_team VARCHAR(10),
        status VARCHAR(20) DEFAULT 'pending',
        sold_to VARCHAR(10),
        sold_price DECIMAL(10, 2)
      )`,

      `CREATE TABLE squads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        team_code VARCHAR(10),
        player_id INT,
        name VARCHAR(100),
        role VARCHAR(50),
        country VARCHAR(50) DEFAULT 'India',
        price DECIMAL(10, 2)
      )`,

      `CREATE TABLE auction_state (
        id INT PRIMARY KEY DEFAULT 1,
        status VARCHAR(20) DEFAULT 'waiting',
        current_player_id INT,
        current_bid DECIMAL(10, 2) DEFAULT 0,
        leading_team_code VARCHAR(10),
        leading_team_name VARCHAR(100),
        bid_count INT DEFAULT 0,
        timer_seconds INT DEFAULT 160
      )`,

      `CREATE TABLE bids (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(10),
        msg TEXT,
        amount DECIMAL(10, 2),
        time VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const q of queries) {
      await connection.query(q);
    }

    console.log('🌱 Seeding teams...');
    for (const t of teams) {
      await connection.execute(`
        INSERT INTO teams (code, name, purse)
        VALUES (?, ?, ?)
      `, [t.code, t.name, t.purse]);
    }

    console.log('🌱 Seeding players...');
    for (const p of players) {
      // Hardcode the ID so we match what we had before (1 to 12)
      await connection.execute(`
        INSERT INTO players (id, name, role, country, base_price, age, stat1, stat1_label, stat2, stat2_label, stat3, stat3_label, prev_team)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [p.id, p.name, p.role, p.country, p.base_price, p.age, p.stat1, p.stat1_label, p.stat2, p.stat2_label, p.stat3, p.stat3_label, p.prev_team]);
    }

    // MySQL AUTO_INCREMENT automatically adjusts when you insert explicit IDs
    // But you can forcibly alter it to start at 13 if needed.
    await connection.query("ALTER TABLE players AUTO_INCREMENT = 13");

    console.log('🌱 Initializing auction state...');
    await connection.execute(`
      INSERT INTO auction_state (id, status, timer_seconds)
      VALUES (1, 'waiting', 180)
    `);

    console.log('✅ Database Initialization Complete! You can now start the server.');
  } catch (err) {
    console.error('❌ Error initializing database:', err);
  } finally {
    if (connection) connection.release();
    pool.end();
  }
}

initializeDatabase();
