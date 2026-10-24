/**
 * Centralized Error-Handling Middleware
 * Logs server errors cleanly without leaking sensitive credentials or internal secrets.
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Sanitized logging: log timestamp, method, url, and message
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [Error] ${req.method} ${req.originalUrl} - ${err.message || 'Unknown error'}`);

  // In non-production, log the stack trace for easier debugging
  if (isDevelopment && err.stack) {
    console.error(err.stack);
  }

  // Sanitized response for client
  const response = {
    status: 'error',
    message: statusCode === 500 && !isDevelopment
      ? 'Internal server error occurred.'
      : err.message || 'Internal server error',
    statusCode,
  };

  if (err.conflicts) {
    response.conflicts = err.conflicts;
  }

  if (err.errors) {
    response.errors = err.errors;
  }

  if (isDevelopment && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
