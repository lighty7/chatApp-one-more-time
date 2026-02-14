const fs = require('fs');
const path = require('path');
const config = require('../config');
const Attachment = require('../models/Attachment');
const { getS3Client } = require('../config/s3');

class FileService {
  async saveFile(fileData, userId, conversationId = null, roomId = null) {
    const isS3 = config.s3.enabled && fileData.location;
    
    const attachment = await Attachment.create({
      filename: fileData.key || fileData.filename,
      originalName: fileData.originalname || fileData.originalName,
      mimetype: fileData.mimetype,
      size: fileData.size,
      storageType: isS3 ? 's3' : 'local',
      localPath: isS3 ? null : fileData.path,
      s3Key: isS3 ? fileData.key : null,
      s3Bucket: isS3 ? config.s3.bucket : null,
      s3Url: isS3 ? fileData.location : null,
      uploadedBy: userId,
      conversationId,
      roomId
    });

    return attachment;
  }

  async getFile(fileId, userId) {
    const attachment = await Attachment.findById(fileId);
    
    if (!attachment) {
      throw new Error('File not found');
    }

    if (attachment.storageType === 's3') {
      return this.getS3SignedUrl(attachment);
    }

    return {
      ...attachment.toObject(),
      url: `/uploads/${attachment.filename}`
    };
  }

  async getS3SignedUrl(attachment) {
    if (!config.s3.enabled) {
      throw new Error('S3 is not enabled');
    }

    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
    
    const s3 = getS3Client();
    const command = new GetObjectCommand({
      Bucket: attachment.s3Bucket,
      Key: attachment.s3Key
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return {
      ...attachment.toObject(),
      url: signedUrl
    };
  }

  async deleteFile(fileId, userId) {
    const attachment = await Attachment.findById(fileId);
    
    if (!attachment) {
      throw new Error('File not found');
    }

    if (attachment.uploadedBy.toString() !== userId.toString()) {
      throw new Error('Not authorized to delete this file');
    }

    if (attachment.storageType === 's3') {
      await this.deleteS3File(attachment.s3Key, attachment.s3Bucket);
    } else if (attachment.localPath) {
      try {
        if (fs.existsSync(attachment.localPath)) {
          fs.unlinkSync(attachment.localPath);
        }
      } catch (error) {
        console.error('Error deleting local file:', error);
      }
    }

    attachment.isActive = false;
    await attachment.save();

    return { success: true };
  }

  async deleteS3File(key, bucket) {
    if (!config.s3.enabled) return;

    const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
    const s3 = getS3Client();
    
    await s3.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: key
    }));
  }

  async getConversationFiles(conversationId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    
    const files = await Attachment.find({
      conversationId,
      isActive: true
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('uploadedBy', 'username displayName')
    .lean();

    return files.map(f => ({
      ...f,
      url: f.storageType === 's3' ? f.s3Url : `/uploads/${f.filename}`
    }));
  }

  async getRoomFiles(roomId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    
    const files = await Attachment.find({
      roomId,
      isActive: true
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('uploadedBy', 'username displayName')
    .lean();

    return files.map(f => ({
      ...f,
      url: f.storageType === 's3' ? f.s3Url : `/uploads/${f.filename}`
    }));
  }

  async getUserFiles(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    
    const files = await Attachment.find({
      uploadedBy: userId,
      isActive: true
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

    return files.map(f => ({
      ...f,
      url: f.storageType === 's3' ? f.s3Url : `/uploads/${f.filename}`
    }));
  }
}

module.exports = new FileService();
