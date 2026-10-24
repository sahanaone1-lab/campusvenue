const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');

/**
 * Migration runner for PostgreSQL.
 * Executes unapplied migration SQL files in transactional blocks
 * and tracks applied migrations in the `schema_migrations` table.
 */
async function runMigrations() {
  console.log('====================================================');
  console.log('       CampusVenue PostgreSQL Migration Runner       ');
  console.log('====================================================');

  const client = await pool.connect();
  try {
    // 1. Ensure schema_migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Fetch already applied migrations
    const { rows: appliedRows } = await client.query(
      'SELECT name, applied_at FROM schema_migrations ORDER BY id ASC;'
    );
    const appliedSet = new Set(appliedRows.map((r) => r.name));

    // 3. Scan migrations directory
    if (!fs.existsSync(MIGRATIONS_DIR)) {
      console.warn(`[Migration Warning] Migrations folder not found at: ${MIGRATIONS_DIR}`);
      return;
    }

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    console.log(`[Migration] Discovered ${files.length} migration file(s).`);

    let newlyAppliedCount = 0;

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`[Migration] [SKIPPED] ${file} (already applied)`);
        continue;
      }

      const filePath = path.join(MIGRATIONS_DIR, file);
      const sqlContent = fs.readFileSync(filePath, 'utf8');

      console.log(`[Migration] [APPLYING] ${file}...`);

      try {
        await client.query('BEGIN;');
        await client.query(sqlContent);
        await client.query(
          'INSERT INTO schema_migrations (name) VALUES ($1);',
          [file]
        );
        await client.query('COMMIT;');
        console.log(`[Migration] [SUCCESS]  ${file} applied successfully.`);
        newlyAppliedCount++;
      } catch (migrationError) {
        await client.query('ROLLBACK;');
        console.error(`\n[Migration ERROR] Failed to apply ${file}:`);
        console.error(migrationError.message);
        throw migrationError;
      }
    }

    console.log('----------------------------------------------------');
    if (newlyAppliedCount === 0) {
      console.log('[Migration] Database is already up to date. No new migrations.');
    } else {
      console.log(`[Migration] Successfully applied ${newlyAppliedCount} new migration(s).`);
    }
    console.log('====================================================\n');
  } finally {
    client.release();
    await pool.end();
  }
}

// Execute migration runner
runMigrations()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('[Migration Runner Fatal Error]', err);
    process.exit(1);
  });
