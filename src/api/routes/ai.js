const express = require('express');
const router = express.Router();
const aiService = require('../../services/aiService');
const userService = require('../../services/userService');

router.get('/models', async (req, res, next) => {
  try {
    const models = await aiService.getModels();
    res.json({ models });
  } catch (error) {
    next(error);
  }
});

router.post('/chat', async (req, res, next) => {
  try {
    const { message, conversationHistory } = req.body;
    const userId = req.user.id;
    
    const user = await userService.getById(userId);
    const model = user.preferredModel || 'qwen2.5-coder:7b';
    
    const history = (conversationHistory || []).map(msg => ({
      role: msg.sender?._id === 'ai' ? 'assistant' : 'user',
      content: msg.content
    }));
    
    const response = await aiService.chat(message, model, history);
    
    res.json({
      message: response.message,
      model: response.model
    });
  } catch (error) {
    next(error);
  }
});

router.put('/model', async (req, res, next) => {
  try {
    const { model } = req.body;
    const userId = req.user.id;
    
    const updatedUser = await userService.updateProfile(userId, { preferredModel: model });
    res.json({ preferredModel: updatedUser.preferredModel });
  } catch (error) {
    next(error);
  }
});

router.get('/model', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await userService.getById(userId);
    res.json({ preferredModel: user.preferredModel || 'qwen2.5-coder:7b' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
