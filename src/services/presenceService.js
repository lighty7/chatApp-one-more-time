const { getRedisClient, getRedisPub, getRedisSub } = require('../config/redis');
const config = require('../config');

class PresenceService {
  constructor() {
    this.heartbeatInterval = null;
    this.subscribers = new Map();
  }

  async initialize() {
    await this.setupSubscriber();
    this.startHeartbeatCleaner();
  }

  async setupSubscriber() {
    const sub = getRedisSub();
    
    await sub.psubscribe('presence:*');
    
    sub.on('pmessage', (pattern, channel, message) => {
      const event = channel.split(':')[1];
      const data = JSON.parse(message);
      
      this.notifySubscribers(event, data);
    });
  }

  startHeartbeatCleaner() {
    setInterval(async () => {
      await this.cleanupStalePresence();
    }, config.presence.offlineAfter);
  }

  async cleanupStalePresence() {
    const redis = getRedisClient();
    const keys = await redis.keys('presence:*:heartbeat');
    
    const now = Date.now();
    for (const key of keys) {
      const lastHeartbeat = await redis.get(key);
      if (lastHeartbeat && (now - parseInt(lastHeartbeat)) > config.presence.offlineAfter) {
        const userId = key.split(':')[1];
        await this.setOffline(userId);
      }
    }
  }

  subscribe(event, callback) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event).add(callback);
    
    return () => {
      this.subscribers.get(event).delete(callback);
    };
  }

  notifySubscribers(event, data) {
    const callbacks = this.subscribers.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
    
    const allCallbacks = this.subscribers.get('*');
    if (allCallbacks) {
      allCallbacks.forEach(cb => cb(event, data));
    }
  }

  async setOnline(userId, socketId) {
    const redis = getRedisClient();
    const key = `presence:${userId}`;
    const socketKey = `presence:${userId}:socket`;
    const heartbeatKey = `presence:${userId}:heartbeat`;
    
    await redis.set(socketKey, socketId);
    await redis.set(heartbeatKey, Date.now().toString());
    await redis.sadd('online_users', userId);
    
    const pub = getRedisPub();
    await pub.publish('presence:online', JSON.stringify({
      userId,
      socketId,
      timestamp: new Date()
    }));

    return { userId, socketId, status: 'online' };
  }

  async setOffline(userId) {
    const redis = getRedisClient();
    const key = `presence:${userId}`;
    const socketKey = `presence:${userId}:socket`;
    const heartbeatKey = `presence:${userId}:heartbeat`;
    
    const socketId = await redis.get(socketKey);
    
    await redis.del(socketKey);
    await redis.del(heartbeatKey);
    await redis.srem('online_users', userId);
    
    const pub = getRedisPub();
    await pub.publish('presence:offline', JSON.stringify({
      userId,
      socketId,
      timestamp: new Date()
    }));

    return { userId, status: 'offline' };
  }

  async updateHeartbeat(userId) {
    const redis = getRedisClient();
    const heartbeatKey = `presence:${userId}:heartbeat`;
    await redis.set(heartbeatKey, Date.now().toString());
  }

  async getOnlineUsers() {
    const redis = getRedisClient();
    return redis.smembers('online_users');
  }

  async isUserOnline(userId) {
    const redis = getRedisClient();
    return (await redis.exists(`presence:${userId}`)) === 1;
  }

  async getUserSocket(userId) {
    const redis = getRedisClient();
    return redis.get(`presence:${userId}:socket`);
  }

  // Typing indicators
  async startTyping(conversationId, userId, conversationType = 'conversation') {
    const redis = getRedisClient();
    const key = `typing:${conversationType}:${conversationId}:${userId}`;
    
    await redis.setex(key, 3, '1');
    
    const pub = getRedisPub();
    await pub.publish(`typing:${conversationType}:${conversationId}`, JSON.stringify({
      type: 'typing',
      userId,
      conversationId,
      conversationType
    }));
  }

  async stopTyping(conversationId, userId, conversationType = 'conversation') {
    const redis = getRedisClient();
    const key = `typing:${conversationType}:${conversationId}:${userId}`;
    
    await redis.del(key);
    
    const pub = getRedisPub();
    await pub.publish(`typing:${conversationType}:${conversationId}`, JSON.stringify({
      type: 'stop_typing',
      userId,
      conversationId,
      conversationType
    }));
  }

  async getTypingUsers(conversationId, conversationType = 'conversation') {
    const redis = getRedisClient();
    const pattern = `typing:${conversationType}:${conversationId}:*`;
    const keys = await redis.keys(pattern);
    
    return keys.map(key => key.split(':').pop());
  }
}

module.exports = new PresenceService();
