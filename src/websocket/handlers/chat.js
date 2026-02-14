const chatService = require('../../services/chatService');
const presenceService = require('../../services/presenceService');

const userMessageCounts = new Map();

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
      const { conversationId, content, type = 'text', attachmentId } = data;

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
        attachmentId
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
}

module.exports = { setupChatHandlers };
