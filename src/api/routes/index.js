const express = require('express');
const router = express.Router();
const { authMiddleware, optionalAuthMiddleware } = require('../middlewares/auth');
const rateLimitService = require('../../services/rateLimitService');

const authRoutes = require('./auth');
const userRoutes = require('./users');
const conversationRoutes = require('./conversations');
const roomRoutes = require('./rooms');
const fileRoutes = require('./files');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/conversations', authMiddleware, conversationRoutes);
router.use('/rooms', roomRoutes);
router.use('/files', optionalAuthMiddleware, fileRoutes);

router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;
