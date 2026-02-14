const { getRedisClient } = require('../config/redis');
const config = require('../config');

class RateLimitService {
  constructor() {
    this.defaultWindowMs = config.rateLimit.api.windowMs;
    this.defaultMax = config.rateLimit.api.max;
  }

  getKey(type, identifier) {
    return `ratelimit:${type}:${identifier}`;
  }

  async isAllowed(type, identifier, customLimit = null) {
    const redis = getRedisClient();
    const key = this.getKey(type, identifier);
    
    const windowMs = customLimit?.windowMs || this.defaultWindowMs;
    const max = customLimit?.max || this.defaultMax;

    const now = Date.now();
    const windowStart = now - windowMs;

    await redis.zadd(key, now, `${now}:${Math.random()}`);
    await redis.zremrangebyscore(key, 0, windowStart);
    const count = await redis.zcard(key);
    await redis.expire(key, Math.ceil(windowMs / 1000));

    return {
      allowed: count <= max,
      remaining: Math.max(0, max - count),
      resetAt: now + windowMs
    };
  }

  async checkRateLimit(type, identifier, customLimit = null) {
    const result = await this.isAllowed(type, identifier, customLimit);
    
    if (!result.allowed) {
      const error = new Error('Rate limit exceeded');
      error.statusCode = 429;
      error.rateLimitInfo = result;
      throw error;
    }

    return result;
  }

  createMiddleware(type, identifierFn = null) {
    return async (req, res, next) => {
      try {
        const identifier = identifierFn 
          ? identifierFn(req) 
          : (req.user?.id || req.ip);
        
        await this.checkRateLimit(type, identifier);
        next();
      } catch (error) {
        if (error.statusCode === 429) {
          return res.status(429).json({
            error: 'Rate limit exceeded',
            retryAfter: Math.ceil((error.rateLimitInfo.resetAt - Date.now()) / 1000)
          });
        }
        next(error);
      }
    };
  }

  async resetRateLimit(type, identifier) {
    const redis = getRedisClient();
    const key = this.getKey(type, identifier);
    await redis.del(key);
  }

  async getRateLimitStatus(type, identifier) {
    const redis = getRedisClient();
    const key = this.getKey(type, identifier);
    
    const count = await redis.zcard(key);
    const ttl = await redis.ttl(key);
    
    return {
      current: count,
      max: this.defaultMax,
      resetIn: ttl > 0 ? ttl * 1000 : this.defaultWindowMs
    };
  }
}

module.exports = new RateLimitService();
