const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'campusvenue',
  user: process.env.DB_USER,
  max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

// Only attach password if provided and non-empty
if (process.env.DB_PASSWORD !== undefined && process.env.DB_PASSWORD !== '') {
  poolConfig.password = process.env.DB_PASSWORD;
}

const pool = new Pool(poolConfig);

// Catch errors on idle clients in the pool to prevent server crashes
pool.on('error', (err) => {
  console.error('[Database Pool Error] Unexpected error on idle PostgreSQL client:', err.message);
});

/**
 * Tests database connectivity by acquiring a client and running a verification query.
 * Handles failures gracefully without crashing the server.
 * 
 * @returns {Promise<{connected: boolean, database?: string, user?: string, timestamp?: string, error?: string, code?: string}>}
 */
const testConnection = async () => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      'SELECT NOW() AS current_time, current_database() AS database_name, current_user AS db_user'
    );
    const row = result.rows[0];
    return {
      connected: true,
      database: row.database_name,
      user: row.db_user,
      timestamp: row.current_time,
    };
  } catch (error) {
    const errorDetails = error.message || 
      (Array.isArray(error.errors) && error.errors.length > 0 
        ? error.errors.map((e) => e.message || e.code).join('; ') 
        : '') || 
      error.code || 
      'Unknown connection error';

    return {
      connected: false,
      error: errorDetails,
      code: error.code || 'CONNECTION_FAILED',
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

module.exports = {
  pool,
  testConnection,
};
