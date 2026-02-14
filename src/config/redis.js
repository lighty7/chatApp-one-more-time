const Redis = require('ioredis');
const config = require('./index');

let redisClient = null;
let redisPub = null;
let redisSub = null;

function createRedisClient() {
  return new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: config.redis.db,
    keyPrefix: config.redis.keyPrefix,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    lazyConnect: true
  });
}

async function connectRedis() {
  try {
    redisClient = createRedisClient();
    redisPub = createRedisClient();
    redisSub = createRedisClient();

    await redisClient.connect();
    await redisPub.connect();
    await redisSub.connect();

    console.log('Redis connected successfully');

    redisClient.on('error', (err) => console.error('Redis Client Error:', err));
    redisPub.on('error', (err) => console.error('Redis Pub Error:', err));
    redisSub.on('error', (err) => console.error('Redis Sub Error:', err));

    return { client: redisClient, pub: redisPub, sub: redisSub };
  } catch (error) {
    console.error('Redis connection failed:', error.message);
    throw error;
  }
}

async function disconnectRedis() {
  if (redisClient) await redisClient.quit();
  if (redisPub) await redisPub.quit();
  if (redisSub) await redisSub.quit();
  console.log('Redis disconnected');
}

function getRedisClient() {
  if (!redisClient) throw new Error('Redis not connected');
  return redisClient;
}

function getRedisPub() {
  if (!redisPub) throw new Error('Redis pub not connected');
  return redisPub;
}

function getRedisSub() {
  if (!redisSub) throw new Error('Redis sub not connected');
  return redisSub;
}

module.exports = {
  connectRedis,
  disconnectRedis,
  getRedisClient,
  getRedisPub,
  getRedisSub,
  createRedisClient
};
