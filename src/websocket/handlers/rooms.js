const chatService = require('../../services/chatService');
const { getRedisClient } = require('../../config/redis');

function setupRoomHandlers(io, socket) {
  const userId = socket.userId;

  socket.on('join-room', async (data, callback) => {
    try {
      const { roomName } = data;
      const room = await chatService.getRoomByName(roomName);
      
      socket.join(`room:${roomName}`);
      
      const redis = getRedisClient();
      await redis.sadd(`room:${roomName}:users`, userId);
      await redis.hset(`room:${roomName}:users:data`, userId, JSON.stringify({
        socketId: socket.id,
        joinedAt: new Date().toISOString()
      }));

      const messages = await chatService.getRoomMessages(roomName, 1, 50);
      const users = await redis.smembers(`room:${roomName}:users`);
      const usersData = await redis.hgetall(`room:${roomName}:users:data`);
      
      const formattedUsers = users.map(uid => {
        const data = usersData[uid] ? JSON.parse(usersData[uid]) : {};
        return { userId: uid, ...data };
      });

      socket.to(`room:${roomName}`).emit('user-joined-room', {
        userId,
        roomName,
        users: formattedUsers
      });

      if (callback) {
        callback({ 
          success: true, 
          room: room.toPublic(),
          messages,
          users: formattedUsers
        });
      }
    } catch (error) {
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });

  socket.on('leave-room', async (data) => {
    try {
      const { roomName } = data;
      
      socket.leave(`room:${roomName}`);
      
      const redis = getRedisClient();
      await redis.srem(`room:${roomName}:users`, userId);
      await redis.hdel(`room:${roomName}:users:data`, userId);

      const users = await redis.smembers(`room:${roomName}:users`);
      
      socket.to(`room:${roomName}`).emit('user-left-room', {
        userId,
        roomName,
        users
      });
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  });

  socket.on('send-room-message', async (data, callback) => {
    try {
      const { roomName, content } = data;
      
      const room = await chatService.getRoomByName(roomName);
      
      const message = {
        id: Date.now().toString(),
        roomName,
        content,
        sender: { userId, socketId: socket.id },
        timestamp: new Date().toISOString()
      };

      await chatService.saveRoomMessage(roomName, message);

      io.to(`room:${roomName}`).emit('room-message', message);

      if (callback) {
        callback({ success: true, message });
      }
    } catch (error) {
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });

  socket.on('get-room-messages', async (data, callback) => {
    try {
      const { roomName, page = 1 } = data;
      const messages = await chatService.getRoomMessages(roomName, page);
      
      if (callback) {
        callback({ success: true, messages });
      }
    } catch (error) {
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });
}

module.exports = { setupRoomHandlers };
