
const readline = require('readline');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './.env.render' });
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question) {
    return new Promise(resolve => rl.question(question, resolve));
}

async function main() {
    try {
        const name = (await ask('Admin name: ')).trim();
        const email = (await ask('Admin email: ')).trim().toLowerCase();
        const password = await ask('Admin password (minimum 8 characters): ');

        if (!name || !email || password.length < 8) {
            throw new Error('Name, email, and a password of at least 8 characters are required.');
        }

        const existing = await pool.query(
            'SELECT id FROM users WHERE LOWER(email) = $1',
            [email]
        );

        if (existing.rows.length) {
            throw new Error('An account with this email already exists.');
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await pool.query(
            `INSERT INTO users
       (name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, 'admin', true)`,
            [name, email, passwordHash]
        );

        console.log('Admin account created successfully.');
    } catch (error) {
        console.error('Could not create admin:', error.message);
    } finally {
        rl.close();
        await pool.end();
    }
}

main();
