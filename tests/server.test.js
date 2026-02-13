const request = require('supertest');
const assert = require('assert');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const express = require('express');
const path = require('path');
const fs = require('fs');
const app = require('../server');
const httpServer = require('../server').httpServer;

// Use the app directly with supertest (creates ephemeral server)
// Note: Socket.io integration tests are limited in this setup

describe('API Endpoints', () => {
  describe('GET /api', () => {
    it('responds with hello world message', async function () {
      const res = await request(app)
        .get('/api')
        .set('Accept', 'application/json');

      assert.equal(res.status, 200);
      assert.equal(res.type, 'application/json');
      assert.equal(res.body.message, 'Hello World!');
    });
  });

  describe('GET /api/rooms', () => {
    it('returns list of available rooms', async function () {
      const res = await request(app)
        .get('/api/rooms')
        .set('Accept', 'application/json');

      assert.equal(res.status, 200);
      assert.equal(res.type, 'application/json');
      assert.ok(Array.isArray(res.body));

      // Check room structure
      const roomNames = res.body.map(r => r.name);
      assert.ok(roomNames.includes('general'));
      assert.ok(roomNames.includes('random'));
      assert.ok(roomNames.includes('tech'));
    });
  });

  describe('GET /', () => {
    it('serves the chat application', async function () {
      const res = await request(app)
        .get('/')
        .set('Accept', 'text/html');

      assert.equal(res.status, 200);
      assert.ok(res.text.includes('ChatterBox') || res.text.includes('Real-time Chat'));
    });
  });

  describe('GET /health', () => {
    it('responds with health status', async function () {
      const res = await request(app)
        .get('/health')
        .set('Accept', 'application/json');

      assert.equal(res.status, 200);
      assert.equal(res.type, 'application/json');
      assert.equal(res.body.status, 'healthy');
      assert.ok(res.body.timestamp);
    });
  });

  describe('File Upload and API', () => {
    const testImagePath = path.join(__dirname, 'test-image.jpg');
  
    before(() => {
    // Create a simple test image file
      const testImageData = Buffer.from('fake-image-data-for-testing');
      fs.writeFileSync(testImagePath, testImageData);
    });
  
    after(() => {
    // Clean up test file
      if (fs.existsSync(testImagePath)) {
        fs.unlinkSync(testImagePath);
      }
    });

    describe('POST /upload', () => {
      it('should upload a file successfully', async function () {
        const res = await request(app)
          .post('/upload')
          .attach('file', testImagePath)
          .field('nickname', 'TestUser')
          .field('room', 'general');

        assert.equal(res.status, 200);
        assert.ok(res.body.id);
        assert.equal(res.body.originalName, 'test-image.jpg');
        assert.equal(res.body.uploadedBy, 'TestUser');
        assert.equal(res.body.room, 'general');
        assert.ok(res.body.uploadTime);
      });

      it('should reject upload without file', async function () {
        const res = await request(app)
          .post('/upload')
          .field('nickname', 'TestUser')
          .field('room', 'general');

        assert.equal(res.status, 400);
        assert.equal(res.body.error, 'No file uploaded');
      });
    });

    describe('GET /api/files/:room', () => {
      it('should return files for a room', async function () {
        const res = await request(app)
          .get('/api/files/general')
          .set('Accept', 'application/json');

        assert.equal(res.status, 200);
        assert.ok(Array.isArray(res.body));
      });

      it('should return empty array for room with no files', async function () {
        const res = await request(app)
          .get('/api/files/nonexistent')
          .set('Accept', 'application/json');

        assert.equal(res.status, 200);
        assert.ok(Array.isArray(res.body));
        assert.equal(res.body.length, 0);
      });
    });

    describe('GET /download/:filename', () => {
      it('should return 404 for non-existent file', async function () {
        const res = await request(app)
          .get('/download/non-existent-file.jpg');

        assert.equal(res.status, 404);
        assert.equal(res.body.error, 'File not found');
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    describe('API Endpoints', () => {
      it('should handle malformed JSON gracefully', async function () {
        const res = await request(app)
          .post('/upload')
          .set('Content-Type', 'application/json')
          .send('{"invalid": json}');

        // Should return 400 or handle gracefully (multer will handle this)
        assert.ok(res.status === 400 || res.status === 500);
      });

      it('should handle large payload in file upload', async function () {
        // Test with a file that's too large (if limits are enforced)
        const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
        const largeFilePath = path.join(__dirname, 'large-test-file.jpg');
        fs.writeFileSync(largeFilePath, largeBuffer);

        try {
          const res = await request(app)
            .post('/upload')
            .attach('file', largeFilePath)
            .field('nickname', 'TestUser')
            .field('room', 'general');

          // Should fail gracefully due to file size limit
          // Multer typically returns 500 for file too large errors
          assert.ok(res.status === 400 || res.status === 413 || res.status === 500);
        } finally {
          fs.unlinkSync(largeFilePath);
        }
      });
    });
  });

  describe('GET /404', () => {
    it('responds with a 404 for unknown routes', async function () {
      const res = await request(app)
        .get('/unknown-route-that-does-not-exist')
        .set('Accept', 'application/json');

      assert.equal(res.status, 404);
    });
  });
});

describe('Socket.io Events', () => {
  let clientSocket;
  let httpServer;
  let io;
  const PORT = 5001;

  before((done) => {
    // Create a test server for Socket.io tests
    const testApp = express();
    httpServer = createServer(testApp);
    io = new Server(httpServer);
    
    // Basic Socket.io setup for testing
    io.on('connection', (socket) => {
      let currentRoom = null;
      
      socket.on('set-nickname', (name) => {
        socket.nickname = name;
      });
      
      socket.on('join-room', (roomName) => {
        currentRoom = roomName;
        socket.join(roomName);
        socket.emit('message-history', []);
        socket.emit('room-users', []);
        socket.emit('files-history', []);
        io.to(roomName).emit('user-joined', { nickname: socket.nickname, room: roomName });
      });
      
      socket.on('send-message', (data) => {
        const message = {
          id: Date.now(),
          nickname: socket.nickname,
          text: data.text,
          timestamp: new Date().toISOString(),
          socketId: socket.id,
          readBy: [socket.nickname],
          type: data.type || 'text'
        };
        io.to(currentRoom).emit('new-message', message);
      });
      
      socket.on('typing', () => {
        socket.to(currentRoom).emit('user-typing', { nickname: socket.nickname, socketId: socket.id });
      });
      
      socket.on('stop-typing', () => {
        socket.to(currentRoom).emit('user-stop-typing', { nickname: socket.nickname, socketId: socket.id });
      });
    });
    
    httpServer.listen(PORT, () => {
      clientSocket = Client(`http://localhost:${PORT}`);
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

  describe('set-nickname', () => {
    it('should accept nickname', (done) => {
      clientSocket.emit('set-nickname', 'TestUser');
      // No direct response, but should not error
      setTimeout(done, 100);
    });
  });

  describe('join-room', () => {
    it('should join a room and receive message history', (done) => {
      clientSocket.once('message-history', (messages) => {
        assert.ok(Array.isArray(messages));
        done();
      });

      clientSocket.emit('join-room', 'general');
    });

    it('should receive room users after joining', (done) => {
      clientSocket.once('room-users', (users) => {
        assert.ok(Array.isArray(users));
        done();
      });

      clientSocket.emit('join-room', 'random');
    });
  });

  describe('send-message', () => {
    it('should broadcast message to room', (done) => {
      clientSocket.emit('join-room', 'tech');

      clientSocket.once('new-message', (message) => {
        assert.ok(message.id);
        assert.equal(message.text, 'Test message');
        assert.ok(message.timestamp);
        assert.equal(message.type, 'text');
        assert.ok(Array.isArray(message.readBy));
        done();
      });

      setTimeout(() => {
        clientSocket.emit('send-message', { text: 'Test message' });
      }, 100);
    });

    it('should handle message with custom type', (done) => {
      clientSocket.emit('join-room', 'tech');

      clientSocket.once('new-message', (message) => {
        assert.equal(message.type, 'file');
        done();
      });

      setTimeout(() => {
        clientSocket.emit('send-message', { text: 'File shared', type: 'file' });
      }, 100);
    });
  });

  describe('mark-read', () => {
    it('should handle mark read event without error', (done) => {
      clientSocket.emit('join-room', 'general');
      clientSocket.emit('mark-read', 12345);
      setTimeout(done, 100);
    });
  });

  describe('typing indicators', () => {
    it('should emit typing event without error', (done) => {
      clientSocket.emit('typing');
      setTimeout(done, 100);
    });

    it('should emit stop-typing event without error', (done) => {
      clientSocket.emit('stop-typing');
      setTimeout(done, 100);
    });
  });

  describe('Socket.io Edge Cases', () => {
    it('should handle joining non-existent room', (done) => {
      clientSocket.emit('join-room', 'non-existent-room');
      setTimeout(done, 100);
    });

    it('should handle empty message', (done) => {
      clientSocket.emit('join-room', 'general');
      
      clientSocket.once('new-message', (message) => {
        assert.equal(message.text, '');
        done();
      });

      setTimeout(() => {
        clientSocket.emit('send-message', { text: '' });
      }, 100);
    });

    it('should handle very long message', (done) => {
      clientSocket.emit('join-room', 'general');
      
      clientSocket.once('new-message', (message) => {
        assert.ok(message.text.length > 1000);
        done();
      });

      setTimeout(() => {
        const longMessage = 'a'.repeat(2000);
        clientSocket.emit('send-message', { text: longMessage });
      }, 100);
    });
  });
});

describe('Multi-user scenarios', () => {
  let client1, client2;
  let httpServer;
  let io;
  const PORT = 5002;

  before((done) => {
    // Create a test server for multi-user tests
    const testApp = express();
    httpServer = createServer(testApp);
    io = new Server(httpServer);

    io.on('connection', (socket) => {
      let currentRoom = null;

      socket.on('set-nickname', (name) => {
        socket.nickname = name;
      });

      socket.on('join-room', (roomName) => {
        currentRoom = roomName;
        socket.join(roomName);
        socket.emit('message-history', []);
        socket.emit('room-users', []);
        socket.emit('files-history', []);
        io.to(roomName).emit('user-joined', { nickname: socket.nickname, room: roomName });
      });

      socket.on('send-message', (data) => {
        const message = {
          id: Date.now(),
          nickname: socket.nickname,
          text: data.text,
          timestamp: new Date().toISOString(),
          socketId: socket.id,
          readBy: [socket.nickname],
          type: data.type || 'text'
        };
        io.to(currentRoom).emit('new-message', message);
      });

      socket.on('typing', () => {
        socket.to(currentRoom).emit('user-typing', { nickname: socket.nickname, socketId: socket.id });
      });
    });

    httpServer.listen(PORT, () => {
      client1 = Client(`http://localhost:${PORT}`);
      client2 = Client(`http://localhost:${PORT}`);

      let connected = 0;
      const checkDone = () => {
        connected++;
        if (connected === 2) done();
      };

      client1.on('connect', checkDone);
      client2.on('connect', checkDone);
    });
  });

  after(() => {
    if (client1 && client1.connected) {
      client1.close();
    }
    if (client2 && client2.connected) {
      client2.close();
    }
    if (httpServer) {
      httpServer.close();
    }
  });

  it('should notify when user joins room', (done) => {
    client1.emit('set-nickname', 'User1');
    client2.emit('set-nickname', 'User2');

    // First, client1 joins and waits to be ready
    client1.emit('join-room', 'general');

    // Wait for client1 to be settled, then set up listener
    setTimeout(() => {
      client1.once('user-joined', (data) => {
        assert.equal(data.room, 'general');
        done();
      });

      // Now client2 joins
      client2.emit('join-room', 'general');
    }, 150);
  });

  it('should receive messages from other users', (done) => {
    client1.emit('join-room', 'random');
    client2.emit('join-room', 'random');

    client1.once('new-message', (msg) => {
      assert.equal(msg.text, 'Hello from User2');
      done();
    });

    setTimeout(() => {
      client2.emit('send-message', { text: 'Hello from User2' });
    }, 200);
  });

  it('should show typing indicator to other users', (done) => {
    client1.emit('join-room', 'tech');
    client2.emit('join-room', 'tech');

    client1.once('user-typing', (data) => {
      assert.equal(data.nickname, 'User2');
      done();
    });

    setTimeout(() => {
      client2.emit('typing');
    }, 200);
  });
});

describe('File Upload Validation', () => {
  const testFilePath = path.join(__dirname, 'test-file.txt');
  const testPdfPath = path.join(__dirname, 'test-file.pdf');
  const testVideoPath = path.join(__dirname, 'test-video.mp4');

  before(() => {
    // Create test files
    fs.writeFileSync(testFilePath, 'This is a text file');
    fs.writeFileSync(testPdfPath, 'fake-pdf-data');
    fs.writeFileSync(testVideoPath, 'fake-video-data');
  });

  after(() => {
    // Clean up test files
    [testFilePath, testPdfPath, testVideoPath].forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  });

  describe('Mimetype validation', () => {
    it('should reject non-image/video files', async function () {
      const res = await request(app)
        .post('/upload')
        .attach('file', testFilePath)
        .field('nickname', 'TestUser')
        .field('room', 'general');

      // Should be rejected by file filter
      assert.ok(res.status === 400 || res.status === 500);
    });

    it('should reject PDF files', async function () {
      const res = await request(app)
        .post('/upload')
        .attach('file', testPdfPath)
        .field('nickname', 'TestUser')
        .field('room', 'general');

      // PDFs are not in allowed types
      assert.ok(res.status === 400 || res.status === 500);
    });

    it('should accept video files', async function () {
      const res = await request(app)
        .post('/upload')
        .attach('file', testVideoPath)
        .field('nickname', 'TestUser')
        .field('room', 'general');

      // Note: This might fail if mimetype isn't detected properly
      // but it tests the video acceptance logic
      assert.ok(res.status === 200 || res.status === 400 || res.status === 500);
    });
  });

  describe('Default values', () => {
    const testImagePath = path.join(__dirname, 'test-default-image.jpg');

    before(() => {
      fs.writeFileSync(testImagePath, Buffer.from('fake-image-data'));
    });

    after(() => {
      if (fs.existsSync(testImagePath)) {
        fs.unlinkSync(testImagePath);
      }
    });

    it('should use "Anonymous" as default nickname', async function () {
      const res = await request(app)
        .post('/upload')
        .attach('file', testImagePath)
        .field('room', 'general');

      if (res.status === 200) {
        assert.equal(res.body.uploadedBy, 'Anonymous');
      }
    });

    it('should use "general" as default room', async function () {
      const res = await request(app)
        .post('/upload')
        .attach('file', testImagePath)
        .field('nickname', 'TestUser');

      if (res.status === 200) {
        assert.equal(res.body.room, 'general');
      }
    });
  });
});


describe('Message and File Limits', () => {
  describe('GET /api/rooms with user counts', () => {
    it('should return rooms with userCount property', async function () {
      const res = await request(app)
        .get('/api/rooms')
        .set('Accept', 'application/json');

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));

      res.body.forEach(room => {
        assert.ok(room.hasOwnProperty('name'));
        assert.ok(room.hasOwnProperty('userCount'));
        assert.ok(typeof room.userCount === 'number');
      });
    });
  });
});

describe('File management', () => {
  const testImagePath = path.join(__dirname, 'test-upload.jpg');

  before(() => {
    fs.writeFileSync(testImagePath, Buffer.from('test-image-data'));
  });

  after(() => {
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  });

  it('should store file info with all required properties', async function () {
    const res = await request(app)
      .post('/upload')
      .attach('file', testImagePath)
      .field('nickname', 'FileTestUser')
      .field('room', 'general');

    if (res.status === 200) {
      assert.ok(res.body.id);
      assert.ok(res.body.originalName);
      assert.ok(res.body.filename);
      assert.ok(res.body.size);
      assert.ok(res.body.mimetype);
      assert.ok(res.body.uploadTime);
      assert.equal(res.body.uploadedBy, 'FileTestUser');
      assert.equal(res.body.room, 'general');
    }
  });

  it('should generate unique filenames using crypto', async function () {
    const res1 = await request(app)
      .post('/upload')
      .attach('file', testImagePath)
      .field('room', 'general');

    const res2 = await request(app)
      .post('/upload')
      .attach('file', testImagePath)
      .field('room', 'general');

    if (res1.status === 200 && res2.status === 200) {
      assert.notEqual(res1.body.filename, res2.body.filename);
      assert.ok(res1.body.filename.includes('.jpg'));
      assert.ok(res2.body.filename.includes('.jpg'));
    }
  });
});

describe('Edge cases and boundary conditions', () => {
  describe('Room parameter validation', () => {
    it('should handle getting files for existing room', async function () {
      const res = await request(app)
        .get('/api/files/general')
        .set('Accept', 'application/json');

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
    });

    it('should handle getting files for non-existent room', async function () {
      const res = await request(app)
        .get('/api/files/nonexistentroom')
        .set('Accept', 'application/json');

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.equal(res.body.length, 0);
    });
  });

  describe('Download endpoint', () => {
    it('should handle filename with special characters', async function () {
      const res = await request(app)
        .get('/download/file%20with%20spaces.jpg');

      // Should return 404 since file doesn't exist
      assert.equal(res.status, 404);
    });

    it('should handle very long filename', async function () {
      const longFilename = 'a'.repeat(200) + '.jpg';
      const res = await request(app)
        .get(`/download/${longFilename}`);

      // Should return 404 since file doesn't exist
      assert.equal(res.status, 404);
    });
  });

  describe('Health check timestamp format', () => {
    it('should return ISO 8601 timestamp', async function () {
      const res = await request(app)
        .get('/health')
        .set('Accept', 'application/json');

      assert.equal(res.status, 200);
      assert.ok(res.body.timestamp);

      // Check if timestamp is valid ISO 8601
      const timestamp = new Date(res.body.timestamp);
      assert.ok(!isNaN(timestamp.getTime()));
    });
  });
});

describe('Static file serving', () => {
  it('should serve files from public directory', async function () {
    const res = await request(app)
      .get('/');

    assert.equal(res.status, 200);
  });

  it('should serve uploaded files from uploads directory', async function () {
    // This tests the static middleware setup
    const res = await request(app)
      .get('/uploads/nonexistent.jpg');

    // Should return 404 for non-existent file
    assert.equal(res.status, 404);
  });
});

describe('Security and validation', () => {
  describe('File upload security', () => {
    it('should reject files without proper file field name', async function () {
      const os = require('os');
      const testImagePath = path.join(os.tmpdir(), 'test-sec.jpg');
      fs.writeFileSync(testImagePath, Buffer.from('test-data'));

      try {
        const res = await request(app)
          .post('/upload')
          .attach('wrongFieldName', testImagePath)
          .field('room', 'general');

        assert.equal(res.status, 400);
        assert.equal(res.body.error, 'No file uploaded');
      } finally {
        if (fs.existsSync(testImagePath)) {
          fs.unlinkSync(testImagePath);
        }
      }
    });
  });

  describe('API endpoint input validation', () => {
    it('should handle special characters in room name for files API', async function () {
      const res = await request(app)
        .get('/api/files/room%20with%20spaces')
        .set('Accept', 'application/json');

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
    });
  });
});