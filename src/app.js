const express = require('express');
const config = require('./config');
const apiRoutes = require('./api/routes');

function createApp() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use((req, res, next) => {
    req.requestTime = new Date().toISOString();
    next();
  });

  if (config.env === 'development') {
    app.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    });
  }

  const uploadDir = config.storage.uploadDir;
  const fs = require('fs');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadDir));

  app.use('/api', apiRoutes);

  app.get('/', (req, res) => {
    res.json({
      name: 'ChatterBox API',
      version: '2.0.0',
      description: 'Production-ready real-time chat API',
      endpoints: {
        health: '/api/health',
        auth: '/api/auth',
        users: '/api/users',
        conversations: '/api/conversations',
        rooms: '/api/rooms',
        files: '/api/files'
      }
    });
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err, req, res, _next) => {
    console.error('Error:', err.message);
    
    const statusCode = err.statusCode || 500;
    const message = config.env === 'development' ? err.message : 'Internal server error';
    
    res.status(statusCode).json({
      error: message,
      ...(config.env === 'development' && { stack: err.stack })
    });
  });

  return app;
}

module.exports = { createApp };
