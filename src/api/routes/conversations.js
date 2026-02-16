const express = require('express');
const router = express.Router();
const chatService = require('../../services/chatService');

router.get('/', async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const userId = req.user.id;
    
    const conversations = await chatService.getConversations(
      userId,
      parseInt(page) || 1,
      parseInt(limit) || 20
    );
    res.json(conversations);
  } catch (error) {
    next(error);
  }
});

router.post('/direct', async (req, res, next) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user.id;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const conversation = await chatService.createDirectConversation(currentUserId, userId);
    res.status(201).json(conversation);
  } catch (error) {
    next(error);
  }
});

router.post('/group', async (req, res, next) => {
  try {
    const { name, description, participantIds } = req.body;
    const userId = req.user.id;
    
    if (!name || !participantIds || participantIds.length === 0) {
      return res.status(400).json({ error: 'Name and participants are required' });
    }

    const conversation = await chatService.createGroupConversation(
      userId,
      name,
      description,
      participantIds
    );
    res.status(201).json(conversation);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const conversation = await chatService.getConversation(req.params.id, req.user.id);
    res.json(conversation);
  } catch (error) {
    if (error.message === 'Conversation not found') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

router.get('/:id/messages', async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const messages = await chatService.getMessages(
      req.params.id,
      req.user.id,
      parseInt(page) || 1,
      parseInt(limit) || 50
    );
    res.json({ messages });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/join', async (req, res, next) => {
  try {
    const conversation = await chatService.addParticipant(
      req.params.id,
      req.user.id,
      req.body.userId || req.user.id
    );
    res.json(conversation);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('authorized')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.post('/:id/leave', async (req, res, next) => {
  try {
    await chatService.leaveConversation(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { name, description, avatar } = req.body;
    const conversation = await chatService.updateGroup(req.params.id, req.user.id, { name, description, avatar });
    res.json(conversation);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('authorized')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.post('/:id/participants', async (req, res, next) => {
  try {
    const { userId } = req.body;
    const conversation = await chatService.addParticipant(req.params.id, req.user.id, userId || req.user.id);
    res.json(conversation);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('authorized') || error.message.includes('already')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.delete('/:id/participants/:userId', async (req, res, next) => {
  try {
    await chatService.removeParticipant(req.params.id, req.user.id, req.params.userId);
    res.json({ success: true });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('authorized')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.put('/:id/participants/:userId/role', async (req, res, next) => {
  try {
    const { role } = req.body;
    const conversation = await chatService.updateParticipantRole(req.params.id, req.user.id, req.params.userId, role);
    res.json(conversation);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('authorized')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.post('/:id/forward', async (req, res, next) => {
  try {
    const { messageId } = req.body;
    const message = await chatService.forwardMessage(req.params.id, messageId, req.user.id);
    res.json(message);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('authorized')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.post('/:id/read', async (req, res, next) => {
  try {
    const { messageIds } = req.body;
    await chatService.markAsRead(req.params.id, req.user.id, messageIds || []);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/messages/:messageId/reactions', async (req, res, next) => {
  try {
    const { emoji } = req.body;
    const userId = req.user.id;
    
    if (!emoji) {
      return res.status(400).json({ error: 'Emoji is required' });
    }

    const message = await chatService.addReaction(req.params.messageId, userId, emoji);
    res.json(message);
  } catch (error) {
    if (error.message === 'Message not found') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

router.delete('/messages/:messageId/reactions', async (req, res, next) => {
  try {
    const { emoji } = req.query;
    const userId = req.user.id;
    
    if (!emoji) {
      return res.status(400).json({ error: 'Emoji is required' });
    }

    const message = await chatService.removeReaction(req.params.messageId, userId, emoji);
    res.json(message);
  } catch (error) {
    if (error.message === 'Message not found') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

module.exports = router;
