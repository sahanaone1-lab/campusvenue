const { testConnection } = require('../config/database');

/**
 * Health check controller to verify API status and database connectivity.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const getHealthStatus = async (req, res, next) => {
  try {
    const dbStatus = await testConnection();

    const response = {
      status: 'ok',
      message: 'CampusVenue API is running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus.connected
        ? {
            status: 'connected',
            database: dbStatus.database,
            user: dbStatus.user,
            serverTime: dbStatus.timestamp,
          }
        : {
            status: 'disconnected',
            error: dbStatus.error,
          },
    };

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHealthStatus,
};
