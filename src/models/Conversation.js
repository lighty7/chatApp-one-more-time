const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'moderator', 'member'],
    default: 'member'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  lastReadMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  mutedUntil: {
    type: Date,
    default: null
  }
});

const conversationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['direct', 'group', 'room'],
    required: true,
    index: true
  },
  name: {
    type: String,
    trim: true,
    maxlength: [100, 'Conversation name cannot exceed 100 characters'],
    default: function() {
      if (this.type === 'direct') return null;
      return 'New Conversation';
    }
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  participants: [participantSchema],
  
  // For direct messages - reference to the other user
  user1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  user2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Group settings
  avatar: {
    type: String,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isPrivate: {
    type: Boolean,
    default: true
  },
  allowMemberInvite: {
    type: Boolean,
    default: true
  },
  
  // Legacy room support
  roomId: {
    type: String,
    sparse: true,
    unique: true,
    lowercase: true
  },
  
  // Message settings
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastMessageAt: {
    type: Date,
    default: null
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: new Map()
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

conversationSchema.index({ participants: 1 });
conversationSchema.index({ type: 1, updatedAt: -1 });
conversationSchema.index({ name: 'text', description: 'text' });

conversationSchema.virtual('participantCount').get(function() {
  return this.participants ? this.participants.length : 0;
});

conversationSchema.virtual('otherParticipant').get(function() {
  if (this.type !== 'direct') return null;
  return this.user1 || this.user2;
});

conversationSchema.methods.getDisplayName = function(currentUserId) {
  if (this.type === 'direct') {
    const other = this.participants.find(
      p => p.user.toString() !== currentUserId.toString()
    );
    return other ? other.user.username : 'Unknown';
  }
  return this.name || 'Unnamed Group';
};

conversationSchema.methods.isAdmin = function(userId) {
  const participant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );
  return participant && participant.role === 'admin';
};

conversationSchema.methods.canSendMessage = function(userId) {
  const participant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );
  if (!participant) return false;
  if (participant.mutedUntil && participant.mutedUntil > new Date()) return false;
  return true;
};

conversationSchema.statics.findDirectConversation = function(user1Id, user2Id) {
  return this.findOne({
    type: 'direct',
    $or: [
      { user1: user1Id, user2: user2Id },
      { user1: user2Id, user2: user1Id }
    ]
  });
};

conversationSchema.statics.findOrCreateDirect = async function(user1Id, user2Id) {
  let conversation = await this.findDirectConversation(user1Id, user2Id);
  
  if (!conversation) {
    conversation = await this.create({
      type: 'direct',
      user1: user1Id,
      user2: user2Id,
      participants: [
        { user: user1Id, role: 'member' },
        { user: user2Id, role: 'member' }
      ]
    });
  }
  
  return conversation;
};

module.exports = mongoose.model('Conversation', conversationSchema);
