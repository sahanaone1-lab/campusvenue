const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validateRegister, validateLogin } = require('../middleware/validator');
const { authenticate } = require('../middleware/auth.middleware');

// Public endpoints
router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);

// Protected endpoint
router.get('/me', authenticate, authController.getMe);

module.exports = router;
