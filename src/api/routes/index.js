const express = require('express');
const router = express.Router();
const { authMiddleware, optionalAuthMiddleware } = require('../middlewares/auth');

const authRoutes = require('./auth');
const userRoutes = require('./users');
const conversationRoutes = require('./conversations');
const roomRoutes = require('./rooms');
const fileRoutes = require('./files');
const aiRoutes = require('./ai');

router.use('/auth', authRoutes);
router.use('/users', authMiddleware, userRoutes);
router.use('/conversations', authMiddleware, conversationRoutes);
router.use('/rooms', authMiddleware, roomRoutes);
router.use('/files', optionalAuthMiddleware, fileRoutes);
router.use('/ai', authMiddleware, aiRoutes);

router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;
