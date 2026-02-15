const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Room = require('../models/Room');
const { getRedisClient, getRedisPub } = require('../config/redis');
const config = require('../config');

class ChatService {
  async createDirectConversation(user1Id, user2Id) {
    if (user1Id.toString() === user2Id.toString()) {
      throw new Error('Cannot create conversation with yourself');
    }

    const [user1, user2] = await Promise.all([
      User.findById(user1Id),
      User.findById(user2Id)
    ]);

    if (!user1 || !user2) {
      throw new Error('User not found');
    }

    const conversation = await Conversation.findOrCreateDirect(user1Id, user2Id);
    await conversation.populate('participants.user', 'username displayName avatar status');

    return conversation;
  }

  async createGroupConversation(userId, name, description, participantIds) {
    const allParticipants = [...new Set([userId, ...participantIds])];
    
    const users = await User.find({ _id: { $in: allParticipants } });
    if (users.length !== allParticipants.length) {
      throw new Error('One or more users not found');
    }

    const conversation = await Conversation.create({
      type: 'group',
      name,
      description,
      participants: allParticipants.map(id => ({
        user: id,
        role: id.toString() === userId.toString() ? 'admin' : 'member'
      })),
      createdBy: userId,
      allowMemberInvite: true
    });

    await conversation.populate('participants.user', 'username displayName avatar status');
    return conversation;
  }

  async getConversations(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const conversations = await Conversation.find({
      'participants.user': userId
    })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('participants.user', 'username displayName avatar status lastSeen');

    const enrichedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const otherParticipant = conv.participants.find(
          p => p.user._id.toString() !== userId.toString()
        );
        
        let displayName = conv.name;
        if (conv.type === 'direct' && otherParticipant) {
          displayName = otherParticipant.user.displayName || otherParticipant.user.username;
        }

        const unreadCount = conv.unreadCount instanceof Map 
          ? conv.unreadCount.get(userId.toString()) || 0 
          : conv.unreadCount?.[userId.toString()] || 0;

        return {
          ...conv.toObject(),
          displayName,
          otherParticipant: conv.type === 'direct' ? otherParticipant?.user : null,
          unreadCount
        };
      })
    );

    return enrichedConversations;
  }

  async getConversation(conversationId, userId) {
    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.user': userId
    })
      .populate('participants.user', 'username displayName avatar status')
      .lean();

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const otherParticipant = conversation.participants.find(
      p => p.user._id.toString() !== userId.toString()
    );

    let displayName = conversation.name;
    if (conversation.type === 'direct' && otherParticipant) {
      displayName = otherParticipant.user.displayName || otherParticipant.user.username;
    }

    return {
      ...conversation,
      displayName,
      otherParticipant: conversation.type === 'direct' ? otherParticipant?.user : null
    };
  }

  async markAsRead(conversationId, userId, messageIds = []) {
    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.user': userId
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const messagesToMark = messageIds.length > 0
      ? { _id: { $in: messageIds }, conversationId }
      : { conversationId, 'readBy.user': { $ne: userId } };

    await Message.updateMany(
      messagesToMark,
      { $push: { readBy: { user: userId, readAt: new Date() } } }
    );

    const redis = getRedisPub();
    await redis.publish(`conversation:${conversationId}`, JSON.stringify({
      type: 'messages_read',
      data: { userId, conversationId, messageIds }
    }));

    return { success: true };
  }

  async addReaction(messageId, userId, emoji) {
    if (!config.reactions.allowedEmojis.includes(emoji)) {
      throw new Error('Invalid emoji. Only predefined reactions are allowed.');
    }

    const message = await Message.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    const existingReaction = message.reactions.find(
      r => r.user.toString() === userId.toString() && r.emoji === emoji
    );

    if (existingReaction) {
      return message;
    }

    const previousReaction = message.reactions.find(
      r => r.user.toString() === userId.toString()
    );

    if (previousReaction) {
      message.reactions = message.reactions.filter(
        r => r.user.toString() !== userId.toString()
      );
    }

    message.reactions.push({ user: userId, emoji });
    await message.save();

    await message.populate('sender', 'username displayName avatar');
    await message.populate('reactions.user', 'username displayName avatar');

    const redisPub = getRedisPub();
    await redisPub.publish(`conversation:${message.conversationId}`, JSON.stringify({
      type: 'message_reaction_added',
      data: { messageId, userId, emoji, message }
    }));

    return message;
  }

  async removeReaction(messageId, userId, emoji) {
    const message = await Message.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    message.reactions = message.reactions.filter(
      r => !(r.user.toString() === userId.toString() && r.emoji === emoji)
    );
    await message.save();

    await message.populate('sender', 'username displayName avatar');
    await message.populate('reactions.user', 'username displayName avatar');

    const redisPub = getRedisPub();
    await redisPub.publish(`conversation:${message.conversationId}`, JSON.stringify({
      type: 'message_reaction_removed',
      data: { messageId, userId, emoji, message }
    }));

    return message;
  }

  async sendMessage(conversationId, userId, content, type = 'text', attachmentId = null, replyTo = null) {
    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.user': userId
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (!conversation.canSendMessage(userId)) {
      throw new Error('You are muted in this conversation');
    }

    const messageData = {
      conversationId,
      sender: userId,
      content,
      type,
      attachment: attachmentId,
      readBy: [{ user: userId, readAt: new Date() }]
    };

    if (replyTo) {
      const parentMessage = await Message.findById(replyTo);
      if (parentMessage && parentMessage.conversationId.toString() === conversationId) {
        messageData.replyTo = replyTo;
      }
    }

    const message = await Message.create(messageData);

    await message.populate('sender', 'username displayName avatar');
    if (attachmentId) {
      await message.populate('attachment');
    }
    if (message.replyTo) {
      await message.populate('replyTo');
    }

    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const redisPub = getRedisPub();
    await redisPub.publish(`conversation:${conversationId}`, JSON.stringify({
      type: 'new_message',
      data: message
    }));

    return message;
  }

  async getMessages(conversationId, userId, page = 1, limit = 50) {
    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.user': userId
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const skip = (page - 1) * limit;

    const messages = await Message.find({
      conversationId,
      isDeleted: false
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username displayName avatar')
      .populate('attachment')
      .lean();

    return messages.reverse();
  }

  async addParticipant(conversationId, userId, newParticipantId) {
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (!conversation.isAdmin(userId) && !conversation.allowMemberInvite) {
      throw new Error('Not authorized to add participants');
    }

    const alreadyParticipant = conversation.participants.some(
      p => p.user.toString() === newParticipantId.toString()
    );

    if (alreadyParticipant) {
      throw new Error('User is already a participant');
    }

    conversation.participants.push({
      user: newParticipantId,
      role: 'member'
    });

    await conversation.save();
    await conversation.populate('participants.user', 'username displayName avatar status');

    return conversation;
  }

  async removeParticipant(conversationId, userId, participantToRemoveId) {
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const isAdmin = conversation.isAdmin(userId);
    const isSelf = userId.toString() === participantToRemoveId.toString();

    if (!isAdmin && !isSelf) {
      throw new Error('Not authorized to remove participants');
    }

    if (conversation.type === 'direct') {
      throw new Error('Cannot remove participants from direct messages');
    }

    conversation.participants = conversation.participants.filter(
      p => p.user.toString() !== participantToRemoveId.toString()
    );

    await conversation.save();

    return conversation;
  }

  async updateParticipantRole(conversationId, adminId, participantId, role) {
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (!conversation.isAdmin(adminId)) {
      throw new Error('Only admins can change roles');
    }

    const participant = conversation.participants.find(
      p => p.user.toString() === participantId.toString()
    );

    if (!participant) {
      throw new Error('Participant not found');
    }

    participant.role = role;
    await conversation.save();

    return conversation;
  }

  async leaveConversation(conversationId, userId) {
    return this.removeParticipant(conversationId, userId, userId);
  }

  // Room-based chat methods (legacy support)
  async getRooms(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    
    const rooms = await Room.find({ isPrivate: false })
      .sort({ lastActivity: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const redis = getRedisClient();
    const enrichedRooms = await Promise.all(
      rooms.map(async (room) => {
        const userCount = await redis.scard(`room:${room.name}:users`);
        return {
          ...room,
          userCount
        };
      })
    );

    return enrichedRooms;
  }

  async getRoomByName(name) {
    const room = await Room.findOne({ name: name.toLowerCase() });
    if (!room) {
      throw new Error('Room not found');
    }

    const redis = getRedisClient();
    const userCount = await redis.scard(`room:${room.name}:users`);

    return {
      ...room.toObject(),
      userCount
    };
  }

  async createRoom(userId, name, description, isPrivate = false, password = null) {
    const existingRoom = await Room.findOne({ name: name.toLowerCase() });
    if (existingRoom) {
      throw new Error('Room already exists');
    }

    const room = await Room.create({
      name: name.toLowerCase(),
      displayName: name,
      description,
      createdBy: userId,
      isPrivate,
      password
    });

    return room;
  }

  async getRoomMessages(roomName, page = 1, limit = 50) {
    const redis = getRedisClient();
    const key = `room:${roomName}:messages`;
    
    const start = -(page * limit);
    const end = -((page - 1) * limit) - 1;
    
    const messages = await redis.lrange(key, start, end);
    return messages.map(m => JSON.parse(m)).reverse();
  }

  async saveRoomMessage(roomName, message) {
    const redis = getRedisClient();
    const key = `room:${roomName}:messages`;
    
    await redis.rpush(key, JSON.stringify(message));
    await redis.ltrim(key, -config.messages.maxHistoryPerRoom, -1);

    await Room.findOneAndUpdate(
      { name: roomName },
      { 
        $inc: { messageCount: 1 },
        lastActivity: new Date()
      }
    );

    const redisPub = getRedisPub();
    await redisPub.publish(`room:${roomName}`, JSON.stringify({
      type: 'room_message',
      data: message
    }));
  }
}

module.exports = new ChatService();
