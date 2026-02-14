const express = require('express');
const router = express.Router();
const chatService = require('../../services/chatService');

router.get('/', async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const rooms = await chatService.getRooms(parseInt(page) || 1, parseInt(limit) || 20);
    res.json(rooms);
  } catch (error) {
    next(error);
  }
});

router.get('/:name', async (req, res, next) => {
  try {
    const room = await chatService.getRoomByName(req.params.name);
    res.json(room.toPublic());
  } catch (error) {
    if (error.message === 'Room not found') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, description, isPrivate, password } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ error: 'Room name is required' });
    }

    const room = await chatService.createRoom(userId, name, description, isPrivate, password);
    res.status(201).json(room.toPublic());
  } catch (error) {
    if (error.message === 'Room already exists') {
      return res.status(409).json({ error: error.message });
    }
    next(error);
  }
});

router.get('/:name/messages', async (req, res, next) => {
  try {
    const { page } = req.query;
    const messages = await chatService.getRoomMessages(req.params.name, parseInt(page) || 1);
    res.json(messages);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
