# Security - Detailed

Comprehensive security guide for ChatterBox.

## Overview

ChatterBox implements multiple security layers to protect user data and prevent attacks.

---

## Authentication

### JWT Tokens

The application uses JSON Web Tokens for authentication:

- **Access Token**: Short-lived (15 min), included in requests
- **Refresh Token**: Long-lived (7 days), used to get new access tokens

### Token Structure

```javascript
// Access Token Payload
{
  userId: "...",
  username: "john",
  iat: 1705312200,
  exp: 1705313100
}
```

### Implementation

```javascript
// Generate tokens
const accessToken = jwt.sign(
  { userId: user._id, username: user.username },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
);

const refreshToken = jwt.sign(
  { userId: user._id },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);
```

---

## Password Security

### Hashing

Passwords are hashed using bcrypt with 12 salt rounds:

```javascript
const bcrypt = require('bcryptjs');

// Hash password
const hash = await bcrypt.hash(password, 12);

// Verify password
const isValid = await bcrypt.compare(password, hash);
```

### Best Practices

- Never store plain text passwords
- Use strong JWT secrets (min 32 characters)
- Implement password strength requirements

---

## Rate Limiting

### Implementation

Redis-based token bucket algorithm:

```javascript
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many requests' }
    });
  }
});
```

### Limits

| Endpoint | Limit |
|----------|-------|
| API | 100 requests/minute |
| WebSocket | 10 messages/second |
| Login | 5 attempts/minute |

---

## Input Validation

### Server-side Validation

All inputs are validated on the server:

```javascript
const Joi = require('joi');

const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30),
  email: Joi.string().email(),
  password: Joi.string().min(8)
});
```

### File Upload Validation

```javascript
const multer = require('multer');

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};
```

---

## CORS Configuration

```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

## Security Headers

Using Helmet.js:

```javascript
const helmet = require('helmet');

app.use(helmet());
```

This sets headers including:
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Content-Security-Policy

---

## Database Security

### MongoDB

- Use replica sets for production
- Enable authentication
- Use connection pooling
- Sanitize queries (prevent injection)

### Redis

- Enable authentication
- Use bind to localhost in production
- Enable protected mode

---

## Environment Variables

Required security variables:

```bash
# Required
JWT_SECRET=your-super-secret-key-min-32-chars
MONGODB_URI=mongodb://user:pass@host:port/database
REDIS_HOST=redis-host
REDIS_PORT=6379
REDIS_PASSWORD=redis-password

# Optional
ALLOWED_ORIGINS=https://example.com,https://app.example.com
SESSION_SECRET=session-secret
```

---

## Security Checklist

- [ ] Change default JWT_SECRET
- [ ] Enable MongoDB authentication
- [ ] Enable Redis authentication
- [ ] Configure CORS origins
- [ ] Enable rate limiting
- [ ] Use HTTPS in production
- [ ] Enable security headers
- [ ] Regular dependency updates
- [ ] Run security audits

---

## Related Documentation

- [API Documentation](API.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Testing](TESTING.md)
