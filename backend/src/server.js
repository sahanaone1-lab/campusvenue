require('dotenv').config();

const app = require('./app');
const { testConnection } = require('./config/database');

const PORT = parseInt(process.env.PORT, 10) || 5000;

async function startServer() {
  console.log('--------------------------------------------------');
  console.log('   Starting CampusVenue Backend Server (Phase 1)   ');
  console.log('--------------------------------------------------');

  // Verify PostgreSQL connection at startup
  console.log('[Database] Checking PostgreSQL connection...');
  const dbHealth = await testConnection();

  if (dbHealth.connected) {
    console.log(`[Database] PostgreSQL connection SUCCESSFUL.`);
    console.log(`[Database] Connected to database: "${dbHealth.database}" as user: "${dbHealth.user}".`);
  } else {
    console.error(`[Database ERROR] Failed to connect to PostgreSQL: ${dbHealth.error}`);
    console.error(`[Database ERROR] Code: ${dbHealth.code}`);
    console.warn(`[Database WARNING] Server will continue running, but database features will be unavailable.`);
    console.warn(`[Database WARNING] Ensure PostgreSQL service is active and check your .env credentials:`);
    console.warn(`  - DB_HOST: ${process.env.DB_HOST || 'localhost'}`);
    console.warn(`  - DB_PORT: ${process.env.DB_PORT || '5432'}`);
    console.warn(`  - DB_NAME: ${process.env.DB_NAME || 'campusvenue'}`);
    console.warn(`  - DB_USER: ${process.env.DB_USER || '(not set)'}`);
  }

  // Verify JWT configuration at startup
  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Security ERROR] JWT_SECRET environment variable must be set in production!');
      process.exit(1);
    } else {
      console.warn('[Security WARNING] JWT_SECRET is not configured in .env. Using development fallback.');
    }
  } else {
    console.log(`[Security] JWT authentication configured (Token Expiration: ${process.env.JWT_EXPIRES_IN || '24h'}).`);
  }

  // Start Express HTTP Server
  const server = app.listen(PORT, () => {
    console.log(`[Server] Express server listening on http://localhost:${PORT}`);
    console.log(`[Server] Health Endpoint: http://localhost:${PORT}/api/health`);
    console.log(`[Server] Allowed Frontend Origin: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    console.log('--------------------------------------------------');
  });

  // Graceful shutdown handling
  const handleShutdown = (signal) => {
    console.log(`\n[Server] Received ${signal}. Closing HTTP server...`);
    server.close(() => {
      console.log('[Server] HTTP server successfully closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
}

startServer().catch((error) => {
  console.error('[Server Error] Critical error starting server:', error);
  process.exit(1);
});
