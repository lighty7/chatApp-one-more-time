const express = require('express');
const router = express.Router();
const authService = require('../../services/authService');
const rateLimitService = require('../../services/rateLimitService');

const loginRateLimit = rateLimitService.createMiddleware('auth:login', (req) => req.ip);
const registerRateLimit = rateLimitService.createMiddleware('auth:register', (req) => req.ip);

router.post('/register', registerRateLimit, async (req, res, next) => {
  try {
    const { username, email, password, displayName } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    const result = await authService.register(username, email, password, displayName);
    
    res.status(201).json(result);
  } catch (error) {
    if (error.message.includes('already')) {
      return res.status(409).json({ error: error.message });
    }
    next(error);
  }
});

router.post('/login', loginRateLimit, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await authService.login(email, password);
    
    res.json(result);
  } catch (error) {
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({ error: error.message });
    }
    next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (userId) {
      await authService.logout(userId);
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const result = await authService.refreshTokens(refreshToken);
    res.json(result);
  } catch (error) {
    if (error.message === 'Invalid refresh token') {
      return res.status(401).json({ error: error.message });
    }
    next(error);
  }
});

router.get('/me', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = authService.verifyAccessToken(token);
    
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = await authService.getCurrentUser(decoded.userId);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const resetToken = await authService.requestPasswordReset(email);
    
    if (resetToken) {
      console.log(`Password reset token for ${email}: ${resetToken}`);
    }

    res.json({ message: 'If the email exists, a reset link has been sent' });
  } catch (error) {
    next(error);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    await authService.resetPassword(token, password);
    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    if (error.message.includes('Invalid or expired')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

module.exports = router;
