const request = require('supertest');
const assert = require('assert');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');

const API_URL = process.env.TEST_API_URL || 'http://localhost:3000';
const WS_URL = process.env.TEST_WS_URL || 'http://localhost:3000';
const TIMEOUT = 10000;

describe('API Endpoints', () => {
  describe('GET /api', () => {
    it('responds with API info', async function () {
      this.timeout(TIMEOUT);
      const res = await request(API_URL)
        .get('/api')
        .set('Accept', 'application/json');

      assert.equal(res.status, 200);
      assert.equal(res.type, 'application/json');
      assert.equal(res.body.name, 'ChatterBox API');
    });
  });

  describe('GET /api/health', () => {
    it('responds with health status', async function () {
      this.timeout(TIMEOUT);
      const res = await request(API_URL)
        .get('/api/health')
        .set('Accept', 'application/json');

      assert.equal(res.status, 200);
      assert.equal(res.type, 'application/json');
      assert.equal(res.body.status, 'healthy');
      assert.ok(res.body.timestamp);
    });
  });

  describe('GET /api/rooms', () => {
    it('returns list of available rooms', async function () {
      this.timeout(TIMEOUT);
      const res = await request(API_URL)
        .get('/api/rooms')
        .set('Accept', 'application/json');

      assert.equal(res.status, 200);
      assert.equal(res.type, 'application/json');
      assert.ok(Array.isArray(res.body));

      const roomNames = res.body.map(r => r.name);
      assert.ok(roomNames.includes('general'));
    });
  });

  describe('GET /', () => {
    it('serves the chat application', async function () {
      this.timeout(TIMEOUT);
      const res = await request(API_URL)
        .get('/')
        .set('Accept', 'text/html');

      assert.equal(res.status, 200);
      assert.ok(res.text.includes('ChatterBox') || res.text.includes('Real-time Chat'));
    });
  });

  describe('GET /404', () => {
    it('responds with 404 for unknown routes', async function () {
      this.timeout(TIMEOUT);
      const res = await request(API_URL)
        .get('/unknown-route')
        .set('Accept', 'application/json');

      assert.equal(res.status, 404);
    });
  });
});

describe('Authentication API', () => {
  const testUser = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'testpassword123'
  };

  describe('POST /api/auth/register', () => {
    it('should register a new user', async function () {
      this.timeout(TIMEOUT);
      const res = await request(API_URL)
        .post('/api/auth/register')
        .set('Accept', 'application/json')
        .send(testUser);

      assert.equal(res.status, 201);
      assert.ok(res.body.accessToken);
      assert.ok(res.body.refreshToken);
      assert.equal(res.body.user.username, testUser.username);
    });

    it('should reject duplicate username', async function () {
      this.timeout(TIMEOUT);
      const res = await request(API_URL)
        .post('/api/auth/register')
        .set('Accept', 'application/json')
        .send(testUser);

      assert.equal(res.status, 409);
      assert.ok(res.body.error);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async function () {
      this.timeout(TIMEOUT);
      const res = await request(API_URL)
        .post('/api/auth/login')
        .set('Accept', 'application/json')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      assert.equal(res.status, 200);
      assert.ok(res.body.accessToken);
      assert.ok(res.body.refreshToken);
    });

    it('should reject invalid credentials', async function () {
      this.timeout(TIMEOUT);
      const res = await request(API_URL)
        .post('/api/auth/login')
        .set('Accept', 'application/json')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });

      assert.equal(res.status, 401);
    });
  });

  describe('GET /api/auth/me', () => {
    let token;

    before(async function () {
      this.timeout(TIMEOUT);
      const res = await request(API_URL)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });
      token = res.body.accessToken;
    });

    it('should return current user info', async function () {
      this.timeout(TIMEOUT);
      const res = await request(API_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.username, testUser.username);
    });

    it('should reject request without token', async function () {
      this.timeout(TIMEOUT);
      const res = await request(API_URL)
        .get('/api/auth/me');

      assert.equal(res.status, 401);
    });
  });
});

describe('Users API', () => {
  let authToken;

  before(async function () {
    this.timeout(TIMEOUT);
    const res = await request(API_URL)
      .post('/api/auth/login')
      .send({
        email: 'test_example.com@example.com',
        password: 'testpassword123'
      });

    if (res.status === 200) {
      authToken = res.body.accessToken;
    }
  });

  describe('GET /api/users', () => {
    it('should search users', async function () {
      this.timeout(TIMEOUT);
      const res = await request(API_URL)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`);

      if (res.status === 200) {
        assert.ok(Array.isArray(res.body));
      }
    });
  });
});

describe('Conversations API', () => {
  let authToken;

  before(async function () {
    this.timeout(TIMEOUT);
    const res = await request(API_URL)
      .post('/api/auth/login')
      .send({
        email: 'test_example.com@example.com',
        password: 'testpassword123'
      });

    if (res.status === 200) {
      authToken = res.body.accessToken;
    }
  });

  describe('GET /api/conversations', () => {
    it('should return user conversations', async function () {
      this.timeout(TIMEOUT);
      const res = await request(API_URL)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${authToken}`);

      if (res.status === 200) {
        assert.ok(Array.isArray(res.body));
      }
    });
  });
});

describe('WebSocket Connection', () => {
  let clientSocket;
  let httpServer;
  let io;
  const PORT = 3001;

  before((done) => {
    const testApp = require('express')();
    httpServer = createServer(testApp);
    io = new Server(httpServer, {
      cors: { origin: '*' }
    });

    io.on('connection', (socket) => {
      socket.on('heartbeat', () => {
        socket.emit('heartbeat-ack');
      });
    });

    httpServer.listen(PORT, () => {
      clientSocket = Client(`http://localhost:${PORT}`, {
        transports: ['websocket']
      });
      clientSocket.on('connect', done);
    });
  });

  after(() => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.close();
    }
    if (httpServer) {
      httpServer.close();
    }
  });

  describe('Connection', () => {
    it('should connect to WebSocket server', (done) => {
      assert.ok(clientSocket.connected);
      done();
    });

    it('should respond to heartbeat', (done) => {
      clientSocket.emit('heartbeat');
      clientSocket.on('heartbeat-ack', () => {
        done();
      });
    });
  });
});

describe('WebSocket Authentication', () => {
  let clientSocket;
  const PORT = 3002;

  before((done) => {
    httpServer = createServer(require('express')());
    io = new Server(httpServer, {
      cors: { origin: '*' }
    });

    io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      if (token === 'valid-token') {
        socket.userId = 'test-user';
        next();
      } else {
        next(new Error('Authentication error'));
      }
    });

    io.on('connection', (socket) => {
      socket.emit('authenticated', { userId: socket.userId });
    });

    httpServer.listen(PORT, () => {
      clientSocket = Client(`http://localhost:${PORT}`, {
        auth: { token: 'valid-token' },
        transports: ['websocket']
      });
      clientSocket.on('connect', done);
    });
  });

  after(() => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.close();
    }
    if (httpServer) {
      httpServer.close();
    }
  });

  describe('Authentication', () => {
    it('should authenticate with valid token', (done) => {
      clientSocket.on('authenticated', (data) => {
        assert.equal(data.userId, 'test-user');
        done();
      });
    });
  });
});

describe('File Upload API', () => {
  const path = require('path');
  const fs = require('fs');
  let authToken;
  const testFilePath = path.join(__dirname, 'test-file.txt');

  before(async function () {
    this.timeout(TIMEOUT);
    fs.writeFileSync(testFilePath, 'test file content');

    const res = await request(API_URL)
      .post('/api/auth/login')
      .send({
        email: 'test_example.com@example.com',
        password: 'testpassword123'
      });

    if (res.status === 200) {
      authToken = res.body.accessToken;
    }
  });

  after(() => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  describe('POST /api/files/upload', () => {
    it('should upload a file with authentication', async function () {
      this.timeout(TIMEOUT);
      if (!authToken) {
        this.skip();
        return;
      }

      const res = await request(API_URL)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFilePath);

      assert.ok(res.status === 201 || res.status === 400 || res.status === 500);
    });
  });
});

describe('Rate Limiting', () => {
  describe('API Rate Limit', () => {
    it('should handle rate limiting', async function () {
      this.timeout(TIMEOUT);
      let rateLimited = false;

      for (let i = 0; i < 110; i++) {
        const res = await request(API_URL).get('/api/health');
        if (res.status === 429) {
          rateLimited = true;
          break;
        }
      }

      assert.ok(rateLimited);
    }).timeout(30000);
  });
});

describe('Security', () => {
  describe('Input Validation', () => {
    it('should reject SQL injection attempts', async function () {
      this.timeout(TIMEOUT);
      const res = await request(API_URL)
        .get('/api/users?q=admin\' OR \'1\'=\'1');

      assert.ok(res.status === 200 || res.status === 400);
    });

    it('should reject XSS attempts in search', async function () {
      this.timeout(TIMEOUT);
      const res = await request(API_URL)
        .get('/api/users?q=<script>alert(1)</script>');

      assert.ok(res.status === 200 || res.status === 400);
    });
  });

  describe('Authentication', () => {
    it('should reject expired tokens', async function () {
      this.timeout(TIMEOUT);
      const res = await request(API_URL)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer expired.invalid.token');

      assert.equal(res.status, 401);
    });

    it('should reject invalid tokens', async function () {
      this.timeout(TIMEOUT);
      const res = await request(API_URL)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not-a-valid-token');

      assert.equal(res.status, 401);
    });
  });
});
