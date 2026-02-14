const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  
  // Storage info
  storageType: {
    type: String,
    enum: ['local', 's3'],
    default: 'local'
  },
  localPath: {
    type: String
  },
  s3Key: {
    type: String
  },
  s3Bucket: {
    type: String
  },
  s3Url: {
    type: String
  },
  
  // Metadata
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  },
  roomId: {
    type: String
  },
  
  // Thumbnail for images
  thumbnailUrl: {
    type: String
  },
  width: {
    type: Number
  },
  height: {
    type: Number
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

attachmentSchema.index({ uploadedBy: 1 });
attachmentSchema.index({ conversationId: 1 });
attachmentSchema.index({ roomId: 1 });

attachmentSchema.methods.getUrl = function() {
  if (this.storageType === 's3' && this.s3Url) {
    return this.s3Url;
  }
  if (this.storageType === 'local' && this.localPath) {
    return `/uploads/${this.filename}`;
  }
  return null;
};

module.exports = mongoose.model('Attachment', attachmentSchema);
