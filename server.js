const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const port = process.env.PORT || 10000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Only allow image and video files
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'), false);
    }
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));

// Health check endpoint for Render
app.get('/health', (req, res) => {
  return res.status(200).send({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// API endpoint
app.get('/api', (req, res) => {
  return res.status(200).send({
    message: 'Hello World!',
  });
});

// In-memory storage for rooms and messages
const rooms = {
  general: { messages: [], users: [] },
  random: { messages: [], users: [] },
  tech: { messages: [], users: [] },
};

const MAX_MESSAGES = 50;
const MAX_FILES = 20; // Maximum files per room

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const fileInfo = {
    id: crypto.randomBytes(16).toString('hex'),
    originalName: req.file.originalname,
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype,
    uploadTime: new Date().toISOString(),
    uploadedBy: req.body.nickname || 'Anonymous',
    room: req.body.room || 'general'
  };

  // Store file info in room
  if (rooms[fileInfo.room]) {
    if (!rooms[fileInfo.room].files) {
      rooms[fileInfo.room].files = [];
    }
    
    rooms[fileInfo.room].files.push(fileInfo);
    
    // Keep only last MAX_FILES
    if (rooms[fileInfo.room].files.length > MAX_FILES) {
      rooms[fileInfo.room].files.shift();
    }
    
    // Broadcast file info to room
    io.to(fileInfo.room).emit('file-shared', fileInfo);
  }

  res.json(fileInfo);
});

// Get files for a room
app.get('/api/files/:room', (req, res) => {
  const room = req.params.room;
  if (rooms[room] && rooms[room].files) {
    res.json(rooms[room].files);
  } else {
    res.json([]);
  }
});

// Download file endpoint
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename);
  
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  let currentRoom = null;
  let nickname = 'Anonymous';

  // Set nickname
  socket.on('set-nickname', (name) => {
    nickname = name || 'Anonymous';
    console.log(`${socket.id} set nickname to: ${nickname}`);
  });

  // Join room
  socket.on('join-room', (roomName) => {
    // Leave previous room if any
    if (currentRoom && rooms[currentRoom]) {
      socket.leave(currentRoom);
      rooms[currentRoom].users = rooms[currentRoom].users.filter(
        (u) => u.id !== socket.id
      );
      io.to(currentRoom).emit('user-left', { nickname, room: currentRoom });
      io.to(currentRoom).emit('room-users', rooms[currentRoom].users);
    }

    // Join new room
    if (rooms[roomName]) {
      currentRoom = roomName;
      socket.join(roomName);
      rooms[roomName].users.push({ id: socket.id, nickname });

      // Initialize files array if it doesn't exist
      if (!rooms[roomName].files) {
        rooms[roomName].files = [];
      }

      // Send message history
      socket.emit('message-history', rooms[roomName].messages);
      
      // Send files history
      socket.emit('files-history', rooms[roomName].files);

      // Notify room
      io.to(roomName).emit('user-joined', { nickname, room: roomName });
      io.to(roomName).emit('room-users', rooms[roomName].users);

      console.log(`${nickname} joined room: ${roomName}`);
    }
  });

  // Send message
  socket.on('send-message', (data) => {
    if (currentRoom && rooms[currentRoom]) {
      const message = {
        id: Date.now(),
        nickname,
        text: data.text,
        timestamp: new Date().toISOString(),
        socketId: socket.id,
        readBy: [nickname], // Sender has read their own message
        type: data.type || 'text', // message type: text, file, system
      };

      // Store message (keep last 50)
      rooms[currentRoom].messages.push(message);
      if (rooms[currentRoom].messages.length > MAX_MESSAGES) {
        rooms[currentRoom].messages.shift();
      }

      // Broadcast to room
      io.to(currentRoom).emit('new-message', message);
    }
  });

  // Mark message as read
  socket.on('mark-read', (messageId) => {
    if (currentRoom && rooms[currentRoom]) {
      const message = rooms[currentRoom].messages.find((m) => m.id === messageId);
      if (message && !message.readBy.includes(nickname)) {
        message.readBy.push(nickname);
        // Broadcast read receipt to room
        io.to(currentRoom).emit('message-read', {
          messageId,
          readBy: message.readBy,
        });
      }
    }
  });

  // Typing indicator
  socket.on('typing', () => {
    if (currentRoom) {
      socket.to(currentRoom).emit('user-typing', { nickname, socketId: socket.id });
    }
  });

  socket.on('stop-typing', () => {
    if (currentRoom) {
      socket.to(currentRoom).emit('user-stop-typing', { nickname, socketId: socket.id });
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom].users = rooms[currentRoom].users.filter(
        (u) => u.id !== socket.id
      );
      io.to(currentRoom).emit('user-left', { nickname, room: currentRoom });
      io.to(currentRoom).emit('room-users', rooms[currentRoom].users);
    }
  });
});

// Get available rooms
app.get('/api/rooms', (req, res) => {
  const roomList = Object.keys(rooms).map((name) => ({
    name,
    userCount: rooms[name].users.length,
  }));
  res.json(roomList);
});

httpServer.listen(port, '0.0.0.0', () => {
  console.log('Chat server listening on http://localhost:' + port);
});

module.exports = app;