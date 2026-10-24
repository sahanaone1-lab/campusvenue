const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { signToken } = require('../utils/jwt');

const SALT_ROUNDS = 10;

/**
 * Registers a new user (student or faculty).
 * Hashes passwords with bcrypt and prevents duplicate accounts.
 * 
 * @param {object} params
 * @param {string} params.name
 * @param {string} params.email
 * @param {string} params.password
 * @param {string} params.role
 * @param {string} [params.department]
 * @param {string} [params.college_id]
 * @returns {Promise<object>} The safe registered user object
 */
const register = async ({ name, email, password, role, department, college_id }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const cleanCollegeId = college_id ? college_id.trim() : null;
  const cleanDepartment = department ? department.trim() : null;

  // 1. Check for duplicate email
  const existingEmailRes = await pool.query(
    'SELECT id FROM users WHERE LOWER(email) = $1;',
    [normalizedEmail]
  );
  if (existingEmailRes.rows.length > 0) {
    const error = new Error('An account with this email address already exists.');
    error.statusCode = 409;
    throw error;
  }

  // 2. Check for duplicate college_id if provided
  if (cleanCollegeId) {
    const existingCollegeIdRes = await pool.query(
      'SELECT id FROM users WHERE college_id = $1;',
      [cleanCollegeId]
    );
    if (existingCollegeIdRes.rows.length > 0) {
      const error = new Error('An account with this College ID already exists.');
      error.statusCode = 409;
      throw error;
    }
  }

  // 3. Hash the password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // 4. Insert user using parameterized SQL
  try {
    const insertRes = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, department, college_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id, name, email, role, department, college_id, is_active, created_at, updated_at;`,
      [name, normalizedEmail, passwordHash, role, cleanDepartment, cleanCollegeId]
    );

    const user = insertRes.rows[0];
    return user;
  } catch (dbError) {
    // Catch database-level unique constraint violations safely
    if (dbError.code === '23505') {
      const error = new Error(
        dbError.constraint === 'uq_users_college_id'
          ? 'An account with this College ID already exists.'
          : 'An account with this email address already exists.'
      );
      error.statusCode = 409;
      throw error;
    }
    throw dbError;
  }
};

/**
 * Authenticates user credentials and generates a signed JWT.
 * 
 * @param {object} params
 * @param {string} params.email
 * @param {string} params.password
 * @returns {Promise<{ token: string, user: object }>}
 */
const login = async ({ email, password }) => {
  const normalizedEmail = (email || '').trim().toLowerCase();

  // Parameterized lookup
  const userRes = await pool.query(
    `SELECT id, name, email, password_hash, role, department, college_id, is_active, created_at
     FROM users
     WHERE LOWER(email) = $1;`,
    [normalizedEmail]
  );

  const user = userRes.rows[0];

  // Protect against user enumeration by returning identical generic error
  if (!user) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  // Check if account is active
  if (!user.is_active) {
    const error = new Error('Account has been deactivated. Please contact your campus administrator.');
    error.statusCode = 403;
    throw error;
  }

  // Verify password hash
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  // Sign token containing trusted id and role
  const token = signToken({
    id: user.id,
    role: user.role,
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      college_id: user.college_id,
      is_active: user.is_active,
      created_at: user.created_at,
    },
  };
};

/**
 * Retrieves the profile of an authenticated user from the database.
 * 
 * @param {number} userId
 * @returns {Promise<object>} The safe user profile
 */
const getMe = async (userId) => {
  const userRes = await pool.query(
    `SELECT id, name, email, role, department, college_id, is_active, created_at, updated_at
     FROM users
     WHERE id = $1;`,
    [userId]
  );

  const user = userRes.rows[0];

  if (!user) {
    const error = new Error('User account not found.');
    error.statusCode = 404;
    throw error;
  }

  if (!user.is_active) {
    const error = new Error('Account has been deactivated.');
    error.statusCode = 403;
    throw error;
  }

  return user;
};

module.exports = {
  register,
  login,
  getMe,
};
