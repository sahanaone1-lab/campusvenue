const authService = require('../services/auth.service');

/**
 * Handle new user registration.
 */
const register = async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    return res.status(201).json({
      status: 'success',
      message: 'User registered successfully.',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle user login and JWT issuance.
 */
const login = async (req, res, next) => {
  try {
    const { token, user } = await authService.login(req.body);
    return res.status(200).json({
      status: 'success',
      message: 'Login successful.',
      data: {
        token,
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle fetching current authenticated user profile.
 */
const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    return res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
};
