const presenceService = require('../../services/presenceService');
const { updateStatus, getUserPresence } = require('../../services/userService');

function setupPresenceHandlers(io, socket) {
  const userId = socket.userId;

  socket.on('heartbeat', async () => {
    try {
      await presenceService.updateHeartbeat(userId);
    } catch (error) {
      console.error('Error updating heartbeat:', error);
    }
  });

  socket.on('update-status', async (data, callback) => {
    try {
      const { status } = data;
      await updateStatus(userId, status);
      
      io.emit('presence:user-status', { userId, status });

      if (callback) {
        callback({ success: true, status });
      }
    } catch (error) {
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });

  socket.on('get-online-users', async (callback) => {
    try {
      const onlineUsers = await presenceService.getOnlineUsers();
      
      if (callback) {
        callback({ success: true, users: onlineUsers });
      }
    } catch (error) {
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });

  socket.on('get-presence', async (data, callback) => {
    try {
      const { userId: targetUserId } = data;
      const presence = await getUserPresence(targetUserId);
      
      if (callback) {
        callback({ success: true, presence });
      }
    } catch (error) {
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });

  presenceService.subscribe('online', (data) => {
    socket.emit('presence:online', data);
  });

  presenceService.subscribe('offline', (data) => {
    socket.emit('presence:offline', data);
  });
}

module.exports = { setupPresenceHandlers };
