# Testing - Detailed

Comprehensive testing guide for ChatterBox.

## Overview

ChatterBox uses Mocha for testing with additional tools for linting and security.

## Test Commands

### Run All Tests

```bash
npm test
```

### Watch Mode

```bash
npm run test:watch
```

### Run Specific Test File

```bash
npm test -- tests/server.test.js
```

### Run with Coverage

```bash
npx mocha --exit --timeout 10000 tests/* --coverage
```

---

## Linting

### Run ESLint

```bash
npm run lint
```

### Auto-fix Issues

```bash
npm run lint:fix
```

### Check Without Failing

```bash
npm run lint:check
```

---

## Security

### Security Audit

```bash
npm run security:check
```

This runs `npm audit --audit-level high`.

### Check for Secrets

```bash
# Using TruffleHog
docker run -it trufflesecurity/trufflehog:latest github --repo https://github.com/Qugates/chatterbox
```

---

## Test Structure

```
tests/
└── server.test.js    # Main test file
```

### Test Categories

1. **Authentication Tests**
   - Registration
   - Login
   - JWT validation

2. **API Tests**
   - Health check
   - User endpoints
   - Conversation endpoints

3. **WebSocket Tests**
   - Connection
   - Messaging
   - Presence

---

## CI/CD Testing

### GitHub Actions

```yaml
# .github/workflows/ci.yml
test:
  runs-on: ubuntu-latest
  services:
    mongodb:
      image: mongo:7
      ports:
        - 27017:27017
    redis:
      image: redis:7-alpine
      ports:
        - 6379:6379
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
    - run: npm ci
    - run: npm test
```

### GitLab CI

```yaml
# .gitlab-ci.yml
test:
  stage: test
  image: node:18-alpine
  parallel:
    matrix:
      - NODE_VERSION: ["18", "20", "21"]
  script:
    - npm ci
    - npm test
```

---

## Environment for Tests

```bash
NODE_ENV=test
MONGODB_URI=mongodb://localhost:27017/chat_test
REDIS_HOST=localhost
REDIS_PORT=6379
TEST_API_URL=http://localhost:3000
JWT_SECRET=test-secret
```

---

## Writing Tests

### Basic Test Example

```javascript
const request = require('supertest');
const { app } = require('../src/app');

describe('API Tests', () => {
  it('should return health status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);
    
    expect(response.body.status).toBe('ok');
  });
});
```

### WebSocket Test Example

```javascript
const io = require('socket.io-client');

describe('WebSocket Tests', () => {
  let socket;
  
  beforeEach((done) => {
    socket = io('http://localhost:3000', {
      auth: { token: 'test-token' }
    });
    socket.on('connect', done);
  });
  
  afterEach(() => {
    socket.disconnect();
  });
  
  it('should authenticate', (done) => {
    socket.on('authenticated', () => {
      done();
    });
    socket.emit('auth', { token: 'valid-token' });
  });
});
```

---

## Test Coverage

### Coverage Report

```bash
npx mocha --exit --timeout 10000 tests/* --reporter spec --coverage
```

### Coverage Thresholds

Add to `package.json`:

```json
"mocha": {
  "coverage": {
    "threshold": {
      "global": 70
    }
  }
}
```

---

## Troubleshooting

### Tests Fail to Start

- Ensure MongoDB and Redis are running
- Check environment variables
- Verify Node.js version (18+)

### Timeout Errors

```bash
# Increase timeout
npm test -- --timeout 30000
```

### MongoDB Connection Error

```bash
# Start MongoDB
docker run -d -p 27017:27017 --name mongodb mongo:7
```

---

## Related Documentation

- [CI/CD](CI-CD.md)
- [Security](SECURITY.md)
- [Docker](DOCKER.md)
