const jwt = require('jsonwebtoken');

/**
 * Retrieves the JWT secret key from environment variables.
 * In production, it enforces presence of the JWT_SECRET to avoid security loopholes.
 * In development, it provides a safe fallback with a warning.
 * 
 * @returns {string} The secret key for signing/verifying JWTs
 */
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable is missing in production!');
    }
    console.warn('[JWT Warning] JWT_SECRET is not configured in .env. Using fallback development secret.');
    return 'campusvenue_fallback_dev_secret_change_in_production_2026';
  }
  return secret;
};

/**
 * Retrieves the configured token expiration time.
 * @returns {string} Token validity duration (e.g. '24h', '7d')
 */
const getExpiresIn = () => {
  return process.env.JWT_EXPIRES_IN || '24h';
};

/**
 * Signs a new JSON Web Token.
 * 
 * @param {object} payload - Claims to embed in the token (e.g. { id, role })
 * @returns {string} The signed JWT string
 */
const signToken = (payload) => {
  const secret = getJwtSecret();
  const expiresIn = getExpiresIn();
  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Verifies a JSON Web Token and returns its decoded payload.
 * Throws an error if the token has expired or the signature is invalid.
 * 
 * @param {string} token - The JWT string to verify
 * @returns {object} The decoded token claims
 */
const verifyToken = (token) => {
  const secret = getJwtSecret();
  return jwt.verify(token, secret);
};

module.exports = {
  signToken,
  verifyToken,
  getJwtSecret,
  getExpiresIn,
};
