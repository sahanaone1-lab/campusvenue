require('dotenv').config({ path: '.env.render' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000
});

async function main() {
  try {
    const result = await pool.query(
      "SELECT current_database() AS database, current_user AS username, to_regclass('public.users') AS users_table"
    );
    console.log(result.rows[0]);
  } catch (error) {
    console.error('Connection failed:', error.message);
  } finally {
    await pool.end();
  }
}

main();