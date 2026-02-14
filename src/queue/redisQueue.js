const { getRedisClient } = require('../config/redis');
const config = require('../config');

const STREAM_KEY = 'chat:messages';
const CONSUMER_GROUP = 'message-processors';
const CONSUMER_NAME = `worker-${process.pid}`;

class MessageQueue {
  constructor() {
    this.isProcessing = false;
  }

  async initialize() {
    const redis = getRedisClient();
    
    try {
      await redis.xgroup('CREATE', STREAM_KEY, CONSUMER_GROUP, '0', 'MKSTREAM');
      console.log('Created consumer group:', CONSUMER_GROUP);
    } catch (error) {
      if (!error.message.includes('BUSYGROUP')) {
        throw error;
      }
      console.log('Consumer group already exists:', CONSUMER_GROUP);
    }
  }

  async addMessage(message) {
    const redis = getRedisClient();
    
    await redis.xadd(STREAM_KEY, '*', 
      'conversationId', message.conversationId.toString(),
      'messageId', message._id.toString(),
      'senderId', message.sender.toString(),
      'type', message.type,
      'content', message.content || '',
      'timestamp', new Date().toISOString()
    );
  }

  async processMessages(handler) {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const redis = getRedisClient();

    while (this.isProcessing) {
      try {
        const messages = await redis.xreadgroup(
          'GROUP', CONSUMER_GROUP, CONSUMER_NAME,
          'COUNT', 10,
          'BLOCK', 5000,
          'STREAMS', STREAM_KEY, '>'
        );

        if (!messages || messages.length === 0) {
          continue;
        }

        for (const [stream, entries] of messages) {
          for (const [id, fields] of entries) {
            const message = this.parseMessage(fields);
            
            try {
              await handler(message);
              await redis.xack(STREAM_KEY, CONSUMER_GROUP, id);
            } catch (error) {
              console.error('Error processing message:', error);
            }
          }
        }
      } catch (error) {
        if (error.message.includes('NOSTREAM')) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        console.error('Error reading messages:', error);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  parseMessage(fields) {
    const message = {};
    for (let i = 0; i < fields.length; i += 2) {
      message[fields[i]] = fields[i + 1];
    }
    return message;
  }

  async getPendingMessages() {
    const redis = getRedisClient();
    return redis.xpending(STREAM_KEY, CONSUMER_GROUP);
  }

  async getStreamInfo() {
    const redis = getRedisClient();
    const info = await redis.xinfo('STREAM', STREAM_KEY);
    return {
      length: info.length,
      firstEntry: info.firstEntry,
      lastEntry: info.lastEntry
    };
  }

  stopProcessing() {
    this.isProcessing = false;
  }
}

module.exports = new MessageQueue();
