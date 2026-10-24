/**
 * 404 Not Found Middleware
 * Intercepts any unhandled route requests and returns a structured JSON 404 response.
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    statusCode: 404,
  });
};

module.exports = notFoundHandler;
