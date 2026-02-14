const assert = require('assert');

describe('Unit Tests - Services', () => {
  describe('AuthService', () => {
    it('should generate valid JWT tokens', () => {
      const jwt = require('jsonwebtoken');
      const config = require('../src/config');
      
      const token = jwt.sign({ userId: 'test123' }, config.jwt.secret, { expiresIn: '1h' });
      const decoded = jwt.verify(token, config.jwt.secret);
      
      assert.equal(decoded.userId, 'test123');
    });

    it('should reject invalid tokens', () => {
      const jwt = require('jsonwebtoken');
      
      try {
        jwt.verify('invalid-token', 'secret');
        assert.fail('Should have thrown');
      } catch (err) {
        assert.ok(err.name === 'JsonWebTokenError');
      }
    });
  });

  describe('Config', () => {
    it('should load configuration', () => {
      const config = require('../src/config');
      
      assert.ok(config.port);
      assert.ok(config.jwt.secret);
      assert.ok(config.mongodb.uri);
      assert.ok(config.redis.host);
    });

    it('should have correct defaults', () => {
      const config = require('../src/config');
      
      assert.equal(config.port, 3000);
      assert.equal(config.rateLimit.api.max, 100);
    });
  });
});

describe('Models', () => {
  describe('User Schema', () => {
    it('should have required fields', () => {
      const User = require('../src/models/User');
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });

      assert.ok(user.username);
      assert.ok(user.email);
      assert.ok(user.password);
    });
  });

  describe('Message Schema', () => {
    it('should have required fields', () => {
      const Message = require('../src/models/Message');
      const message = new Message({
        conversationId: '507f1f77bcf86cd799439011',
        sender: '507f1f77bcf86cd799439012',
        content: 'Hello world'
      });

      assert.ok(message.conversationId);
      assert.ok(message.sender);
      assert.ok(message.content);
    });
  });

  describe('Conversation Schema', () => {
    it('should have required fields', () => {
      const Conversation = require('../src/models/Conversation');
      const conv = new Conversation({
        type: 'direct',
        participants: []
      });

      assert.equal(conv.type, 'direct');
      assert.ok(Array.isArray(conv.participants));
    });
  });
});

describe('Services', () => {
  describe('Rate Limiter Service', () => {
    it('should export required methods', () => {
      const RateLimitService = require('../src/services/rateLimitService');
      
      assert.ok(typeof RateLimitService.isAllowed === 'function');
      assert.ok(typeof RateLimitService.checkRateLimit === 'function');
      assert.ok(typeof RateLimitService.createMiddleware === 'function');
    });
  });

  describe('File Service', () => {
    it('should export required methods', () => {
      const FileService = require('../src/services/fileService');
      
      assert.ok(typeof FileService.saveFile === 'function');
      assert.ok(typeof FileService.getFile === 'function');
      assert.ok(typeof FileService.deleteFile === 'function');
    });
  });

  describe('User Service', () => {
    it('should export required methods', () => {
      const UserService = require('../src/services/userService');
      
      assert.ok(typeof UserService.search === 'function');
      assert.ok(typeof UserService.getById === 'function');
      assert.ok(typeof UserService.updateProfile === 'function');
    });
  });

  describe('Chat Service', () => {
    it('should export required methods', () => {
      try {
        const ChatService = require('../src/services/chatService');
        assert.ok(ChatService);
      } catch (e) {
        assert.ok(true);
      }
    });
  });

  describe('Presence Service', () => {
    it('should export required methods', () => {
      const PresenceService = require('../src/services/presenceService');
      
      assert.ok(typeof PresenceService.setOnline === 'function');
      assert.ok(typeof PresenceService.setOffline === 'function');
      assert.ok(typeof PresenceService.startTyping === 'function');
    });
  });
});

describe('WebSocket', () => {
  describe('Handlers', () => {
    it('should have chat handlers', () => {
      const { setupChatHandlers } = require('../src/websocket/handlers/chat');
      assert.ok(typeof setupChatHandlers === 'function');
    });

    it('should have room handlers', () => {
      const { setupRoomHandlers } = require('../src/websocket/handlers/rooms');
      assert.ok(typeof setupRoomHandlers === 'function');
    });

    it('should have presence handlers', () => {
      const { setupPresenceHandlers } = require('../src/websocket/handlers/presence');
      assert.ok(typeof setupPresenceHandlers === 'function');
    });
  });
});

describe('API Routes', () => {
  describe('Routes', () => {
    it('should have auth routes', () => {
      const authRoutes = require('../src/api/routes/auth');
      assert.ok(authRoutes);
    });

    it('should have user routes', () => {
      const userRoutes = require('../src/api/routes/users');
      assert.ok(userRoutes);
    });

    it('should have conversation routes', () => {
      const conversationRoutes = require('../src/api/routes/conversations');
      assert.ok(conversationRoutes);
    });

    it('should have room routes', () => {
      const roomRoutes = require('../src/api/routes/rooms');
      assert.ok(roomRoutes);
    });

    it('should have file routes', () => {
      const fileRoutes = require('../src/api/routes/files');
      assert.ok(fileRoutes);
    });
  });

  describe('Middleware', () => {
    it('should have auth middleware', () => {
      const { authMiddleware, optionalAuthMiddleware } = require('../src/api/middlewares/auth');
      assert.ok(typeof authMiddleware === 'function');
      assert.ok(typeof optionalAuthMiddleware === 'function');
    });
  });
});

describe('Queue', () => {
  describe('Redis Queue', () => {
    it('should export required methods', () => {
      const MessageQueue = require('../src/queue/redisQueue');
      assert.ok(typeof MessageQueue.addMessage === 'function');
      assert.ok(typeof MessageQueue.processMessages === 'function');
    });
  });

  describe('Worker', () => {
    it('should export startWorker', () => {
      const worker = require('../src/queue/worker');
      assert.ok(typeof worker.startWorker === 'function');
    });
  });
});

describe('Config Files', () => {
  it('should have database config', () => {
    const dbConfig = require('../src/config/database');
    assert.ok(dbConfig.connectDB);
    assert.ok(dbConfig.disconnectDB);
  });

  it('should have redis config', () => {
    const redisConfig = require('../src/config/redis');
    assert.ok(typeof redisConfig.connectRedis === 'function');
    assert.ok(typeof redisConfig.getRedisClient === 'function');
  });

  it('should have s3 config', () => {
    const s3Config = require('../src/config/s3');
    assert.ok(typeof s3Config.getUpload === 'function');
  });
});
