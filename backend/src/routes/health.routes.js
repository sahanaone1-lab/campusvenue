const express = require('express');
const router = express.Router();
const { getHealthStatus } = require('../controllers/health.controller');

// GET /api/health - Endpoint to check API and database health
router.get('/health', getHealthStatus);

module.exports = router;
