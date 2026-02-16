const chatService = require('../../services/chatService');
const presenceService = require('../../services/presenceService');
const aiService = require('../../services/aiService');
const userService = require('../../services/userService');
const config = require('../../config');

const userMessageCounts = new Map();
const userReactionCounts = new Map();

function setupChatHandlers(io, socket) {
  const userId = socket.userId;

  presenceService.updateHeartbeat(userId);

  socket.on('heartbeat', async () => {
    await presenceService.updateHeartbeat(userId);
  });

  socket.on('join-conversation', async (data, callback) => {
    try {
      const { conversationId } = data;
      
      socket.join(`conversation:${conversationId}`);
      socket.join(`user:${userId}:notifications:${conversationId}`);
      
      const conversation = await chatService.getConversation(conversationId, userId);
      const messages = await chatService.getMessages(conversationId, userId, 1, 50);
      
      await chatService.markAsRead(conversationId, userId);
      
      socket.to(`conversation:${conversationId}`).emit('message-delivered', {
        conversationId,
        userId
      });

      if (callback) {
        callback({ success: true, conversation, messages });
      }
    } catch (error) {
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });

  socket.on('leave-conversation', async (data) => {
    const { conversationId } = data;
    socket.leave(`conversation:${conversationId}`);
  });

  socket.on('send-message', async (data, callback) => {
    try {
      const { conversationId, content, type = 'text', attachmentId, replyTo } = data;

      const now = Date.now();
      const userCount = userMessageCounts.get(userId) || { count: 0, resetAt: now + 1000 };
      
      if (now > userCount.resetAt) {
        userMessageCounts.set(userId, { count: 1, resetAt: now + 1000 });
      } else {
        userCount.count++;
        userMessageCounts.set(userId, userCount);
        
        if (userCount.count > 10) {
          socket.emit('error', { message: 'Rate limit exceeded. Please slow down.' });
          return;
        }
      }

      const message = await chatService.sendMessage(
        conversationId,
        userId,
        content,
        type,
        attachmentId,
        replyTo
      );

      io.to(`conversation:${conversationId}`).emit('new-message', message);

      const conversation = await chatService.getConversation(conversationId, userId);
      const otherParticipants = conversation.participants.filter(p => {
        const participantUserId = p.user._id ? p.user._id.toString() : p.user.toString();
        return participantUserId !== userId.toString();
      });
      
      console.log('Sending notifications to participants:', otherParticipants.map(p => p.user.toString()));
      
      for (const participant of otherParticipants) {
        const participantId = participant.user._id ? participant.user._id.toString() : participant.user.toString();
        console.log('Emitting notification to user:', participantId);
        io.to(`user:${participantId}`).emit('notification', {
          type: 'new_message',
          conversationId,
          message,
          sender: message.sender,
          timestamp: new Date()
        });
      }

      if (callback) {
        callback({ success: true, message });
      }
    } catch (error) {
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });

  socket.on('mark-read', async (data) => {
    try {
      const { conversationId, messageIds } = data;
      await chatService.markAsRead(conversationId, userId, messageIds);
      
      io.to(`conversation:${conversationId}`).emit('message-read', {
        conversationId,
        userId,
        messageIds
      });
    } catch (error) {
      console.error('Error marking read:', error);
    }
  });

  socket.on('typing', async (data) => {
    try {
      const { conversationId } = data;
      socket.to(`conversation:${conversationId}`).emit('user-typing', {
        userId,
        conversationId
      });
    } catch (error) {
      console.error('Error broadcasting typing:', error);
    }
  });

  socket.on('stop-typing', async (data) => {
    try {
      const { conversationId } = data;
      socket.to(`conversation:${conversationId}`).emit('user-stop-typing', {
        userId,
        conversationId
      });
    } catch (error) {
      console.error('Error broadcasting stop typing:', error);
    }
  });

  socket.on('add-reaction', async (data, callback) => {
    try {
      const { messageId, emoji, conversationId } = data;
      
      const now = Date.now();
      const reactionLimit = config.reactions.rateLimit;
      const userReactionCount = userReactionCounts.get(userId) || { count: 0, resetAt: now + reactionLimit.windowMs };
      
      if (now > userReactionCount.resetAt) {
        userReactionCounts.set(userId, { count: 1, resetAt: now + reactionLimit.windowMs });
      } else {
        userReactionCount.count++;
        userReactionCounts.set(userId, userReactionCount);
        
        if (userReactionCount.count > reactionLimit.max) {
          socket.emit('error', { message: 'Rate limit exceeded for reactions. Please slow down.' });
          return;
        }
      }
      
      const message = await chatService.addReaction(messageId, userId, emoji);
      
      io.to(`conversation:${conversationId}`).emit('message-reaction-added', {
        messageId,
        emoji,
        userId,
        message
      });

      if (callback) {
        callback({ success: true, message });
      }
    } catch (error) {
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });

  socket.on('remove-reaction', async (data, callback) => {
    try {
      const { messageId, emoji, conversationId } = data;
      
      const message = await chatService.removeReaction(messageId, userId, emoji);
      
      io.to(`conversation:${conversationId}`).emit('message-reaction-removed', {
        messageId,
        emoji,
        userId,
        message
      });

      if (callback) {
        callback({ success: true, message });
      }
    } catch (error) {
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });

  socket.on('ai-message', async (data, callback) => {
    try {
      const { message, conversationHistory } = data;
      
      const user = await userService.getById(userId);
      const model = user.preferredModel || 'qwen2.5-coder:7b';
      
      const history = (conversationHistory || []).map(msg => ({
        role: msg.sender === 'ai' ? 'assistant' : 'user',
        content: msg.content
      }));
      
      const aiMessage = {
        _id: `ai-${Date.now()}`,
        conversationId: 'ai-chat',
        sender: { _id: 'ai', displayName: 'AI Assistant' },
        content: '',
        type: 'text',
        createdAt: new Date().toISOString(),
        isAI: true
      };
      
      socket.emit('ai-typing', { isTyping: true });
      
      const abortController = new AbortController();
      socket.aiAbortController = abortController;
      
      let fullResponse = '';
      
      for await (const chunk of aiService.streamChat(message, model, history, abortController.signal)) {
        fullResponse += chunk;
        socket.emit('ai-stream', { 
          content: chunk,
          fullContent: fullResponse
        });
      }
      
      delete socket.aiAbortController;
      aiMessage.content = fullResponse;
      
      socket.emit('ai-typing', { isTyping: false });
      socket.emit('ai-message', aiMessage);
      
      if (callback) {
        callback({ success: true, message: aiMessage });
      }
    } catch (error) {
      delete socket.aiAbortController;
      console.error('Error in AI message:', error);
      socket.emit('ai-error', { error: error.message });
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });

  socket.on('ai-stop', async () => {
    try {
      if (socket.aiAbortController) {
        socket.aiAbortController.abort();
        delete socket.aiAbortController;
        socket.emit('ai-typing', { isTyping: false });
        socket.emit('ai-stopped', { success: true });
      }
    } catch (error) {
      console.error('Error stopping AI message:', error);
    }
  });

  socket.on('add-participant', async (data, callback) => {
    try {
      const { conversationId, userId } = data;
      const conversation = await chatService.addParticipant(conversationId, userId, userId);
      
      io.to(`conversation:${conversationId}`).emit('participant-added', {
        conversationId,
        userId,
        conversation
      });

      if (callback) {
        callback({ success: true, conversation });
      }
    } catch (error) {
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });

  socket.on('remove-participant', async (data, callback) => {
    try {
      const { conversationId, userId } = data;
      await chatService.removeParticipant(conversationId, userId, userId);
      
      io.to(`conversation:${conversationId}`).emit('participant-removed', {
        conversationId,
        userId
      });

      if (callback) {
        callback({ success: true });
      }
    } catch (error) {
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });

  socket.on('update-participant-role', async (data, callback) => {
    try {
      const { conversationId, userId, role } = data;
      const conversation = await chatService.updateParticipantRole(conversationId, userId, userId, role);
      
      io.to(`conversation:${conversationId}`).emit('participant-role-updated', {
        conversationId,
        userId,
        role,
        conversation
      });

      if (callback) {
        callback({ success: true, conversation });
      }
    } catch (error) {
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });
}

module.exports = { setupChatHandlers };
