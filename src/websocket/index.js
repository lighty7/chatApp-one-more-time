const { Server } = require('socket.io');
const config = require('../config');
const authService = require('../services/authService');
const presenceService = require('../services/presenceService');
const { getRedisPub, getRedisSub } = require('../config/redis');
const { setupChatHandlers } = require('./handlers/chat');
const { setupRoomHandlers } = require('./handlers/rooms');
const { setupPresenceHandlers } = require('./handlers/presence');

let io = null;

function setupWebSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: config.cors.origin,
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = authService.verifyAccessToken(token);
      if (!decoded) {
        return next(new Error('Invalid token'));
      }

      socket.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.userId} (${socket.id})`);

    try {
      await presenceService.setOnline(socket.userId, socket.id);
      socket.join(`user:${socket.userId}`);
    } catch (error) {
      console.error('Error setting presence:', error);
    }

    setupChatHandlers(io, socket);
    setupRoomHandlers(io, socket);
    setupPresenceHandlers(io, socket);

    socket.on('disconnect', async (reason) => {
      console.log(`User disconnected: ${socket.userId} (${reason})`);
      
      try {
        await presenceService.setOffline(socket.userId);
      } catch (error) {
        console.error('Error setting offline:', error);
      }
    });

    socket.emit('authenticated', {
      userId: socket.userId,
      socketId: socket.id
    });

    const presence = await import('../services/userService.js');
    const userPresence = await presence.default.getUserPresence(socket.userId);
    socket.emit('presence:update', userPresence);
  });

  setupRedisSubscriptions();

  return io;
}

async function setupRedisSubscriptions() {
  const sub = getRedisSub();

  await sub.psubscribe('conversation:*');
  await sub.psubscribe('room:*');
  await sub.psubscribe('presence:*');
  await sub.psubscribe('typing:*');

  sub.on('pmessage', (pattern, channel, message) => {
    const [entity, id, ...rest] = channel.split(':').slice(1);
    const data = JSON.parse(message);

    if (entity === 'conversation') {
      io.to(`conversation:${id}`).emit('conversation:event', data);
    } else if (entity === 'room') {
      io.to(`room:${id}`).emit('room:event', data);
    } else if (entity === 'presence' || entity === 'online' || entity === 'offline') {
      io.emit('presence:event', { type: entity, ...data });
    } else if (entity === 'typing') {
      io.to(`conversation:${id}`).emit('typing:event', data);
    }
  });
}

function getIO() {
  return io;
}

module.exports = {
  setupWebSocket,
  getIO
};
