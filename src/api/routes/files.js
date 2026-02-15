const express = require('express');
const router = express.Router();
const multer = require('multer');
const fileService = require('../../services/fileService');
const { getUpload } = require('../../config/s3');

router.post('/upload', async (req, res, next) => {
  try {
    const upload = getUpload();
    
    upload.single('file')(req, res, async (err) => {
      if (err) {
        if (err.code === 'LIMIT_UNEXPECTED_FILE_FIELD') {
          return res.status(400).json({ error: 'Invalid file field name. Use "file" as the field name.' });
        }
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File too large' });
        }
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const userId = req.user?.id;
      const conversationId = req.body.conversationId || null;
      const roomId = req.body.roomId || null;

      try {
        const attachment = await fileService.saveFile(
          req.file,
          userId,
          conversationId,
          roomId
        );

        res.status(201).json({
          ...attachment.toObject(),
          url: attachment.storageType === 's3' ? attachment.s3Url : `/uploads/${attachment.filename}`
        });
      } catch (saveError) {
        console.error('Error saving file:', saveError);
        res.status(500).json({ error: 'Error saving file metadata' });
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const file = await fileService.getFile(req.params.id, userId);
    res.json(file);
  } catch (error) {
    if (error.message === 'File not found') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    await fileService.deleteFile(req.params.id, userId);
    res.json({ success: true });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('authorized')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.get('/conversation/:conversationId', async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const files = await fileService.getConversationFiles(
      req.params.conversationId,
      parseInt(page) || 1,
      parseInt(limit) || 20
    );
    res.json(files);
  } catch (error) {
    next(error);
  }
});

router.get('/room/:roomId', async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const files = await fileService.getRoomFiles(
      req.params.roomId,
      parseInt(page) || 1,
      parseInt(limit) || 20
    );
    res.json(files);
  } catch (error) {
    next(error);
  }
});

router.get('/user/me', async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const userId = req.user?.id;
    const files = await fileService.getUserFiles(
      userId,
      parseInt(page) || 1,
      parseInt(limit) || 20
    );
    res.json(files);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
