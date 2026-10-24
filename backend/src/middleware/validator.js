/**
 * Validation Middleware for Authentication Endpoints
 * Sanitizes input and rejects malformed or unauthorized registration requests.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates the registration request body.
 */
const validateRegister = (req, res, next) => {
  const { name, email, password, role, department, college_id } = req.body || {};
  const errors = [];

  // 1. Name validation
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Name is required and must be at least 2 characters long.');
  } else if (name.trim().length > 100) {
    errors.push('Name cannot exceed 100 characters.');
  }

  // 2. Email validation
  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push('A valid email address is required.');
  } else if (email.trim().length > 255) {
    errors.push('Email cannot exceed 255 characters.');
  }

  // 3. Password validation
  if (!password || typeof password !== 'string') {
    errors.push('Password is required.');
  } else if (password.length < 8) {
    errors.push('Password must be at least 8 characters long.');
  }

  // 4. Role validation
  if (!role || typeof role !== 'string') {
    errors.push('Role is required (must be either "student" or "faculty").');
  } else {
    const cleanRole = role.trim().toLowerCase();
    if (cleanRole === 'admin') {
      return res.status(400).json({
        status: 'error',
        message: 'Admin accounts cannot be registered via public registration. Contact your system administrator.',
        statusCode: 400,
      });
    }
    if (!['student', 'faculty'].includes(cleanRole)) {
      errors.push('Invalid role. Public registration is only available for "student" and "faculty".');
    }
  }

  // 5. Department validation (optional)
  if (department !== undefined && department !== null) {
    if (typeof department !== 'string' || department.length > 150) {
      errors.push('Department must be a string up to 150 characters.');
    }
  }

  // 6. College ID validation (optional)
  if (college_id !== undefined && college_id !== null) {
    if (typeof college_id !== 'string' || college_id.length > 50) {
      errors.push('College ID must be a string up to 50 characters.');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: errors[0],
      errors,
      statusCode: 400,
    });
  }

  // Normalize fields on request body for downstream processing
  req.body.name = name.trim();
  req.body.email = email.trim().toLowerCase();
  req.body.role = role.trim().toLowerCase();
  if (department && typeof department === 'string') {
    req.body.department = department.trim();
  }
  if (college_id && typeof college_id === 'string') {
    req.body.college_id = college_id.trim();
  }

  next();
};

/**
 * Validates the login request body.
 */
const validateLogin = (req, res, next) => {
  const { email, password } = req.body || {};
  const errors = [];

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push('A valid email address is required.');
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    errors.push('Password is required.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: errors[0],
      errors,
      statusCode: 400,
    });
  }

  // Normalize email
  req.body.email = email.trim().toLowerCase();

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
};
