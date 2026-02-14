const chatService = require('../../services/chatService');
const rateLimitService = require('../../services/rateLimitService');

const userMessageCounts = new Map();

function setupChatHandlers(io, socket) {
  const userId = socket.userId;

  socket.on('join-conversation', async (data, callback) => {
    try {
      const { conversationId } = data;
      
      socket.join(`conversation:${conversationId}`);
      
      const conversation = await chatService.getConversation(conversationId, userId);
      const messages = await chatService.getMessages(conversationId, userId, 1, 50);
      
      await chatService.markAsRead(conversationId, userId);
      
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
