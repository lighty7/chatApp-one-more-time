const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Room name is required'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [2, 'Room name must be at least 2 characters'],
    maxlength: [50, 'Room name cannot exceed 50 characters'],
    match: [/^[a-z0-9-]+$/, 'Room name can only contain lowercase letters, numbers, and hyphens']
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Display name cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    select: false
  },
  maxUsers: {
    type: Number,
    default: 100,
    max: 1000
  },
  allowFileSharing: {
    type: Boolean,
    default: true
  },
  messageCount: {
    type: Number,
    default: 0
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

roomSchema.index({ isPrivate: 1, createdAt: -1 });

roomSchema.pre('save', function(next) {
  this.lastActivity = new Date();
  next();
});

roomSchema.methods.toPublic = function() {
  return {
    id: this._id,
    name: this.name,
    displayName: this.displayName,
    description: this.description,
    isPrivate: this.isPrivate,
    maxUsers: this.maxUsers,
    allowFileSharing: this.allowFileSharing,
    messageCount: this.messageCount,
    lastActivity: this.lastActivity,
    createdAt: this.createdAt,
    userCount: this.userCount || 0
  };
};

module.exports = mongoose.model('Room', roomSchema);
