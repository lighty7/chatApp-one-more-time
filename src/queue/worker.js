const messageQueue = require('./redisQueue');
const Message = require('../models/Message');

async function handleMessage(message) {
  console.log('Processing message:', message.messageId);
  
  const messageDoc = await Message.findById(message.messageId);
  if (!messageDoc) {
    console.log('Message not found, may have been deleted');
    return;
  }

  console.log(`Message processed: ${messageDoc._id}`);
}

async function startWorker() {
  console.log('Starting message queue worker...');
  
  try {
    await messageQueue.initialize();
    console.log('Worker initialized successfully');
    
    await messageQueue.processMessages(handleMessage);
  } catch (error) {
    console.error('Worker error:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  console.log('SIGTERM received, stopping worker...');
  messageQueue.stopProcessing();
  setTimeout(() => process.exit(0), 5000);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, stopping worker...');
  messageQueue.stopProcessing();
  setTimeout(() => process.exit(0), 5000);
});

if (require.main === module) {
  startWorker();
}

module.exports = { startWorker, handleMessage };
