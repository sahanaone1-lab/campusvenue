const { verifyToken } = require('../utils/jwt');
const { pool } = require('../config/database');

/**
 * Authentication Middleware
 * Extracts and verifies JWT from Bearer Authorization header,
 * ensures user exists and is active in database, and attaches user to req.user.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required. Missing or malformed Authorization header.',
        statusCode: 401,
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required. Token is missing.',
        statusCode: 401,
      });
    }

    // Verify token signature and expiration
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication token has expired. Please log in again.',
          statusCode: 401,
        });
      }
      return res.status(401).json({
        status: 'error',
        message: 'Invalid authentication token.',
        statusCode: 401,
      });
    }

    // Always re-validate the account against the database
    // Ensures deleted or deactivated accounts cannot access protected resources
    const userRes = await pool.query(
      `SELECT id, name, email, role, department, college_id, is_active
       FROM users
       WHERE id = $1;`,
      [decoded.id]
    );

    const user = userRes.rows[0];

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authenticated account no longer exists.',
        statusCode: 401,
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        status: 'error',
        message: 'Account has been deactivated. Access revoked.',
        statusCode: 401,
      });
    }

    // Attach trusted database-verified identity to request
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      college_id: user.college_id,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-Based Authorization Middleware Factory
 * Checks whether the authenticated user possesses one of the permitted roles.
 * Supported roles: 'student', 'faculty', 'admin'
 * 
 * @param {...string} allowedRoles - Allowed roles for the endpoint
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required before checking permissions.',
        statusCode: 401,
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: `Access forbidden: Insufficient permissions. Requires one of [${allowedRoles.join(', ')}].`,
        statusCode: 403,
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};
