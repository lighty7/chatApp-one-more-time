const mongoose = require('mongoose');
const config = require('./index');

let isConnected = false;

async function connectDB() {
  if (isConnected) {
    return mongoose;
  }

  try {
    const { uri, options } = config.mongodb;
    
    await mongoose.connect(uri, options);
    
    isConnected = true;
    console.log('MongoDB connected successfully');
    
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
      isConnected = false;
    });
    
    return mongoose;
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    throw error;
  }
}

async function disconnectDB() {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  console.log('MongoDB disconnected');
}

function getDB() {
  return mongoose.connection.db;
}

module.exports = {
  connectDB,
  disconnectDB,
  getDB,
  mongoose
};
