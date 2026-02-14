const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const fs = require('fs');
const config = require('./index');

let s3Client = null;
let upload = null;

function getS3Client() {
  if (!s3Client && config.s3.enabled) {
    s3Client = new S3Client({
      endpoint: `https://${config.s3.endpoint}`,
      region: config.s3.region,
      credentials: {
        accessKeyId: config.s3.accessKey,
        secretAccessKey: config.s3.secretKey
      },
      forcePathStyle: config.s3.forcePathStyle
    });
  }
  return s3Client;
}

function createUpload() {
  if (config.s3.enabled) {
    const { S3Client } = require('@aws-sdk/client-s3');
    const { multerS3 } = require('multer-s3');
    
    const s3 = getS3Client();
    
    upload = multer({
      storage: multerS3({
        s3: s3,
        bucket: config.s3.bucket,
        acl: 'private',
        metadata: (req, file, cb) => {
          cb(null, {
            originalName: file.originalname,
            mimetype: file.mimetype,
            userId: req.user?.id || 'anonymous'
          });
        },
        key: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const ext = path.extname(file.originalname);
          const folder = req.user ? `users/${req.user.id}` : 'anonymous';
          cb(null, `${folder}/${uniqueSuffix}${ext}`);
        }
      }),
      limits: {
        fileSize: config.storage.maxFileSize
      },
      fileFilter: (req, file, cb) => {
        if (config.storage.allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('File type not allowed'), false);
        }
      }
    });
  } else {
    const uploadDir = config.storage.uploadDir;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    upload = multer({
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const ext = path.extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        }
      }),
      limits: {
        fileSize: config.storage.maxFileSize
      },
      fileFilter: (req, file, cb) => {
        if (config.storage.allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('File type not allowed'), false);
        }
      }
    });
  }

  return upload;
}

function getUpload() {
  if (!upload) {
    upload = createUpload();
  }
  return upload;
}

module.exports = {
  getS3Client,
  getUpload,
  createUpload
};
