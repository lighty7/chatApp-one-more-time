const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  },

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/chat',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    keyPrefix: isProduction ? 'chat:prod:' : 'chat:dev:'
  },

  s3: {
    enabled: process.env.S3_ENABLED === 'true',
    endpoint: process.env.S3_ENDPOINT || 'localhost:9000',
    accessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.S3_SECRET_KEY || 'minioadmin',
    bucket: process.env.S3_BUCKET || 'chat-files',
    region: process.env.S3_REGION || 'us-east-1',
    forcePathStyle: true
  },

  storage: {
    uploadDir: isProduction ? '/tmp/chat-uploads' : path.join(__dirname, '..', 'uploads'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024,
    allowedMimeTypes: [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv'
    ]
  },

  rateLimit: {
    api: {
      windowMs: 60 * 1000,
      max: parseInt(process.env.RATE_LIMIT_API, 10) || 100
    },
    ws: {
      windowMs: 1000,
      max: parseInt(process.env.RATE_LIMIT_WS, 10) || 10
    }
  },

  presence: {
    heartbeatInterval: 5000,
    offlineAfter: 15000
  },

  messages: {
    maxHistoryPerRoom: 100,
    maxHistoryPerConversation: 50
  },

  cors: {
    origin: process.env.CORS_ORIGIN || (isDevelopment ? ['http://localhost:3000', 'http://localhost:10000'] : ['*']),
    credentials: true
  }
};
