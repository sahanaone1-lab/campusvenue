require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

const SALT_ROUNDS = 10;

/**
 * CLI utility to safely provision an administrator account.
 * Usage:
 *   node src/scripts/createAdmin.js --name "Admin Name" --email "admin@college.edu" --password "SecretPass123!" --department "IT"
 */
async function createAdmin() {
  const args = process.argv.slice(2);
  const params = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      params[key] = val;
    }
  }

  const name = params.name || process.env.ADMIN_INITIAL_NAME;
  const email = params.email || process.env.ADMIN_INITIAL_EMAIL;
  const password = params.password || process.env.ADMIN_INITIAL_PASSWORD;
  const department = params.department || 'Campus Administration';
  const collegeId = params.college_id || null;

  if (!name || !email || !password) {
    console.log('================================================================');
    console.log('       CampusVenue Initial Administrator Provisioning Tool       ');
    console.log('================================================================');
    console.log('Usage:');
    console.log('  node src/scripts/createAdmin.js --name "<name>" --email "<email>" --password "<password>" [--department "<dept>"] [--college_id "<id>"]\n');
    console.log('Example:');
    console.log('  node src/scripts/createAdmin.js --name "Campus Admin" --email "admin@campusvenue.edu" --password "AdminSecure#2026" --department "Administration"\n');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('[Error] Admin password must be at least 8 characters long.');
    process.exit(1);
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1;', [cleanEmail]);
    if (existing.rows.length > 0) {
      console.error(`[Error] User with email "${cleanEmail}" already exists.`);
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, department, college_id, is_active)
       VALUES ($1, $2, $3, 'admin', $4, $5, true)
       RETURNING id, name, email, role, department, created_at;`,
      [name.trim(), cleanEmail, passwordHash, department.trim(), collegeId ? collegeId.trim() : null]
    );

    const admin = result.rows[0];
    console.log('================================================================');
    console.log('[SUCCESS] Administrator account provisioned successfully!');
    console.log(`  ID:         ${admin.id}`);
    console.log(`  Name:       ${admin.name}`);
    console.log(`  Email:      ${admin.email}`);
    console.log(`  Role:       ${admin.role}`);
    console.log(`  Department: ${admin.department}`);
    console.log(`  Created At: ${admin.created_at}`);
    console.log('================================================================');
  } catch (error) {
    console.error('[Fatal Error] Failed to create administrator:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createAdmin();
