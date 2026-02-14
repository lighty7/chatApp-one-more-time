const http = require('http');
const { createApp } = require('./src/app');
const { connectDB } = require('./src/config/database');
const { connectRedis } = require('./src/config/redis');
const { setupWebSocket } = require('./src/websocket');
const presenceService = require('./src/services/presenceService');
const config = require('./src/config');

async function startServer() {
  try {
    console.log('Starting server...');
    console.log(`Environment: ${config.env}`);

    console.log('Connecting to MongoDB...');
    await connectDB();

    console.log('Connecting to Redis...');
    await connectRedis();

    console.log('Initializing presence service...');
    await presenceService.initialize();

    const app = createApp();
    const server = http.createServer(app);

    console.log('Setting up WebSocket...');
    setupWebSocket(server);

    server.listen(config.port, '0.0.0.0', () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    ChatterBox API                          ║
║               Production Chat Server v2.0                   ║
╠═══════════════════════════════════════════════════════════╣
║  Server running on http://localhost:${config.port}              ║
║  Environment: ${config.env.padEnd(43)}║
║  WebSocket:   Enabled                                   ║
║  API Health:  http://localhost:${config.port}/api/health     ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${config.port} is already in use`);
      } else {
        console.error('Server error:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  const { disconnectDB } = require('./src/config/database');
  const { disconnectRedis } = require('./src/config/redis');
  
  await disconnectDB();
  await disconnectRedis();
  
  process.exit(0);
});

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
