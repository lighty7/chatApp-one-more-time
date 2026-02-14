const express = require('express');
const router = express.Router();
const userService = require('../../services/userService');
const authService = require('../../services/authService');
const { getOnlineUsers } = require('../../services/presenceService');

router.get('/', async (req, res, next) => {
  try {
    const { q, limit } = req.query;
    const userId = req.user.id;
    
    const users = await userService.search(q, parseInt(limit) || 20, userId);
    res.json(users);
  } catch (error) {
    next(error);
  }
});

router.get('/online', async (req, res, next) => {
  try {
    const onlineUserIds = await getOnlineUsers();
    const users = await Promise.all(
      onlineUserIds.map(id => userService.getById(id))
    );
    res.json(users);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const user = await userService.getById(req.params.id);
    res.json(user);
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

router.get('/username/:username', async (req, res, next) => {
  try {
    const user = await userService.getByUsername(req.params.username);
    res.json(user);
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'Not authorized to update this user' });
    }

    const user = await userService.updateProfile(req.params.id, req.body);
    res.json(user);
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

router.get('/:id/presence', async (req, res, next) => {
  try {
    const presence = await userService.getUserPresence(req.params.id);
    res.json(presence);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
