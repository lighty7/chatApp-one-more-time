const User = require('../models/User');
const { getRedisClient } = require('../config/redis');

class UserService {
  async search(query, limit = 20, currentUserId) {
    const searchQuery = {
      _id: { $ne: currentUserId }
    };

    if (query) {
      searchQuery.$or = [
        { username: { $regex: query, $options: 'i' } },
        { displayName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ];
    }

    const users = await User.find(searchQuery)
      .select('username displayName avatar status lastSeen')
      .limit(limit)
      .lean();

    const redis = getRedisClient();
    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        const isOnline = await redis.exists(`presence:${user._id}`);
        return {
          ...user,
          isOnline: isOnline === 1
        };
      })
    );

    return enrichedUsers;
  }

  async getById(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user.toJSON();
  }

  async getByUsername(username) {
    const user = await User.findOne({ username });
    if (!user) {
      throw new Error('User not found');
    }
    return user.toJSON();
  }

  async updateProfile(userId, updates) {
    const allowedUpdates = ['displayName', 'avatar', 'settings'];
    const filteredUpdates = {};
    
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: filteredUpdates },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new Error('User not found');
    }

    return user.toJSON();
  }

  async updateStatus(userId, status) {
    const validStatuses = ['online', 'away', 'busy', 'offline'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status');
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { 
        status,
        ...(status === 'offline' ? { lastSeen: new Date() } : {})
      },
      { new: true }
    );

    if (!user) {
      throw new Error('User not found');
    }

    return user.toJSON();
  }

  async getUserPresence(userId) {
    const redis = getRedisClient();
    const isOnline = await redis.exists(`presence:${userId}`);
    const user = await User.findById(userId).select('status lastSeen');
    
    if (!user) {
      return { isOnline: false, status: 'offline' };
    }

    return {
      isOnline: isOnline === 1,
      status: isOnline === 1 ? 'online' : user.status,
      lastSeen: user.lastSeen
    };
  }

  async getMultiplePresence(userIds) {
    const redis = getRedisClient();
    const users = await User.find({ _id: { $in: userIds } })
      .select('status lastSeen')
      .lean();

    const presenceMap = {};
    
    await Promise.all(
      users.map(async (user) => {
        const isOnline = await redis.exists(`presence:${user._id}`);
        presenceMap[user._id.toString()] = {
          isOnline: isOnline === 1,
          status: isOnline === 1 ? 'online' : user.status,
          lastSeen: user.lastSeen
        };
      })
    );

    return presenceMap;
  }
}

module.exports = new UserService();
