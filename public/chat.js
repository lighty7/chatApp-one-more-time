// Socket.io client
const socket = io();

// DOM Elements
const nicknameModal = document.getElementById('nicknameModal');
const nicknameInput = document.getElementById('nicknameInput');
const joinBtn = document.getElementById('joinBtn');
const chatContainer = document.getElementById('chatContainer');
const currentUserEl = document.getElementById('currentUser');
const roomList = document.getElementById('roomList');
const userList = document.getElementById('userList');
const onlineCount = document.getElementById('onlineCount');
const currentRoomEl = document.getElementById('currentRoom');
const welcomeRoom = document.getElementById('welcomeRoom');
const messagesContainer = document.getElementById('messagesContainer');
const messagesEl = document.getElementById('messages');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const typingIndicator = document.getElementById('typingIndicator');
const typingText = document.getElementById('typingText');

// File sharing elements
const fileBtn = document.getElementById('fileBtn');
const fileInput = document.getElementById('fileInput');
const uploadProgress = document.getElementById('uploadProgress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const filesPanel = document.getElementById('filesPanel');
const filesList = document.getElementById('filesList');
const filesToggle = document.getElementById('filesToggle');
const toggleFiles = document.getElementById('toggleFiles');

// Mobile menu elements
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const sidebar = document.querySelector('.sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

let nickname = '';
let currentRoom = 'general';
let typingTimeout;
const typingUsers = new Map();
let sharedFiles = new Map(); // Store shared files by ID

// Join chat with nickname
function joinChat() {
  const name = nicknameInput.value.trim();
  if (name) {
    nickname = name;
    socket.emit('set-nickname', nickname);

    nicknameModal.style.display = 'none';
    chatContainer.style.display = 'grid';
    currentUserEl.textContent = nickname;

    // Join default room
    joinRoom('general');
  }
}

joinBtn.addEventListener('click', joinChat);
nicknameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') joinChat();
});

// Room selection
roomList.addEventListener('click', (e) => {
  const roomItem = e.target.closest('.room-item');
  if (roomItem) {
    const room = roomItem.dataset.room;
    if (room !== currentRoom) {
      joinRoom(room);
    }
  }
});

function joinRoom(room) {
  // Update UI
  document.querySelectorAll('.room-item').forEach(item => {
    item.classList.toggle('active', item.dataset.room === room);
  });

  currentRoom = room;
  currentRoomEl.textContent = room;
  welcomeRoom.textContent = room;
  messagesEl.innerHTML = '';

  // Join room on server
  socket.emit('join-room', room);
}

// Send message
messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();

  if (text) {
    socket.emit('send-message', { text });
    socket.emit('stop-typing');
    messageInput.value = '';
  }
});

// Typing indicator
messageInput.addEventListener('input', () => {
  socket.emit('typing');

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('stop-typing');
  }, 1000);
});

// Socket event handlers
socket.on('message-history', (messages) => {
  messagesEl.innerHTML = '';
  messages.forEach(msg => appendMessage(msg));
  scrollToBottom();
});

socket.on('new-message', (message) => {
  appendMessage(message);
  scrollToBottom();
});

socket.on('user-joined', (data) => {
  appendSystemMessage(`${data.nickname} joined the room`);
});

socket.on('user-left', (data) => {
  appendSystemMessage(`${data.nickname} left the room`);
});

socket.on('room-users', (users) => {
  userList.innerHTML = users
    .map(u => `<li>${u.nickname}</li>`)
    .join('');
  onlineCount.textContent = `(${users.length})`;

  // Update room user counts
  document.getElementById(`count-${currentRoom}`).textContent = users.length;
});

socket.on('user-typing', (data) => {
  if (data.socketId !== socket.id) {
    typingUsers.set(data.socketId, data.nickname);
    updateTypingIndicator();
  }
});

socket.on('user-stop-typing', (data) => {
  typingUsers.delete(data.socketId);
  updateTypingIndicator();
});

// Helper functions
function appendMessage(msg) {
  const isOwn = msg.socketId === socket.id;
  const time = new Date(msg.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  const messageEl = document.createElement('div');
  messageEl.className = `message ${isOwn ? 'own' : ''} ${msg.type === 'file' ? 'file-message' : ''}`;
  messageEl.dataset.messageId = msg.id;

  // Format read-by list (exclude the sender)
  const readByOthers = (msg.readBy || []).filter(name => name !== msg.nickname);
  const readByText = formatReadBy(readByOthers);

  let messageContent = '';
    
  if (msg.type === 'file' && msg.fileInfo) {
    const file = msg.fileInfo;
    const fileIcon = getFileIcon(file.mimetype);
    const fileSize = formatFileSize(file.size);
        
    // Create preview content based on file type
    let previewContent = '';
    if (file.mimetype.startsWith('image/')) {
      previewContent = `<img src="/uploads/${file.filename}" alt="${escapeHtml(file.originalName)}" class="file-preview-image">`;
    } else if (file.mimetype.startsWith('video/')) {
      previewContent = `<video src="/uploads/${file.filename}" class="file-preview-video" controls></video>`;
    } else {
      previewContent = `
                <div class="file-icon-large">${fileIcon}</div>
                <div class="file-info">
                    <div class="file-name">${escapeHtml(file.originalName)}</div>
                    <div class="file-size">${fileSize}</div>
                </div>
            `;
    }
        
    messageContent = `
            <div class="file-message-content">
                <div class="file-preview" onclick="window.open('/uploads/${file.filename}', '_blank')">
                    ${previewContent}
                </div>
                <div class="file-message-actions">
                    <button class="file-download-btn" onclick="event.stopPropagation(); downloadFile('${file.filename}', '${file.originalName}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Download
                    </button>
                </div>
                <div class="file-message-text">${escapeHtml(msg.text.replace(`Shared file: ${file.originalName}`, '').trim())}</div>
            </div>
            <div></div>
        `;
  } else {
    messageContent = `<div class="message-content">${escapeHtml(msg.text)}</div>`;
  }

  messageEl.innerHTML = `
    <div class="message-header">
      <span class="message-author">${msg.nickname}</span>
      <span class="message-time">${time}</span>
      ${msg.type === 'file' ? '<span class="message-badge">📎 File</span>' : ''}
    </div>
    ${messageContent}
    <div class="read-by" data-msg-id="${msg.id}">${readByText}</div>
  `;

  messagesEl.appendChild(messageEl);

  // Mark as read if not own message
  if (!isOwn) {
    socket.emit('mark-read', msg.id);
  }
}

function formatReadBy(readers) {
  if (readers.length === 0) return '';
  if (readers.length === 1) return `✓ Read by ${readers[0]}`;
  if (readers.length === 2) return `✓ Read by ${readers[0]} and ${readers[1]}`;
  return `✓ Read by ${readers[0]}, ${readers[1]} and ${readers.length - 2} more`;
}

// Listen for read receipt updates
socket.on('message-read', (data) => {
  const readByEl = document.querySelector(`.read-by[data-msg-id="${data.messageId}"]`);
  if (readByEl) {
    // Get the message to find the sender
    const messageEl = readByEl.closest('.message');
    const authorEl = messageEl?.querySelector('.message-author');
    const senderName = authorEl?.textContent || '';

    const readByOthers = data.readBy.filter(name => name !== senderName);
    readByEl.textContent = formatReadBy(readByOthers);
  }
});

function appendSystemMessage(text) {
  const el = document.createElement('div');
  el.className = 'system-message';
  el.textContent = text;
  messagesEl.appendChild(el);
  scrollToBottom();
}

function updateTypingIndicator() {
  if (typingUsers.size > 0) {
    const names = Array.from(typingUsers.values());
    let text;
    if (names.length === 1) {
      text = `${names[0]} is typing`;
    } else if (names.length === 2) {
      text = `${names[0]} and ${names[1]} are typing`;
    } else {
      text = 'Several people are typing';
    }
    typingText.textContent = text;
    typingIndicator.style.display = 'flex';
  } else {
    typingIndicator.style.display = 'none';
  }
}

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// File upload functionality
fileBtn.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    uploadFile(file);
  }
});

function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('nickname', nickname);
  formData.append('room', currentRoom);

  // Show progress
  uploadProgress.style.display = 'block';
  progressFill.style.width = '0%';
  progressText.textContent = 'Uploading...';

  fetch('/upload', {
    method: 'POST',
    body: formData
  })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        throw new Error(data.error);
      }
        
      // Store file info
      sharedFiles.set(data.id, data);
        
      // Add system message about file
      const fileMessage = {
        id: Date.now(),
        nickname: nickname,
        text: `Shared file: ${data.originalName}`,
        timestamp: new Date().toISOString(),
        type: 'file',
        fileInfo: data
      };
        
      socket.emit('send-message', fileMessage);
        
      // Hide progress
      uploadProgress.style.display = 'none';
        
      // Clear file input
      fileInput.value = '';
    })
    .catch(error => {
      console.error('Upload error:', error);
      progressText.textContent = 'Upload failed';
      setTimeout(() => {
        uploadProgress.style.display = 'none';
      }, 3000);
    });
}

// Files panel toggle
filesToggle.addEventListener('click', () => {
  filesPanel.style.display = filesPanel.style.display === 'none' ? 'block' : 'none';
  if (filesPanel.style.display === 'block') {
    loadSharedFiles();
  }
});

toggleFiles.addEventListener('click', () => {
  filesPanel.style.display = 'none';
});

// Mobile menu functionality
mobileMenuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  sidebarOverlay.classList.toggle('active');
});

sidebarOverlay.addEventListener('click', () => {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('active');
});

function loadSharedFiles() {
  fetch(`/api/files/${currentRoom}`)
    .then(res => res.json())
    .then(files => {
      displaySharedFiles(files);
    });
}

function displaySharedFiles(files) {
  filesList.innerHTML = '';
    
  if (files.length === 0) {
    filesList.innerHTML = '<p class="no-files">No files shared yet</p>';
    return;
  }
    
  files.forEach(file => {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
        
    const fileIcon = getFileIcon(file.mimetype);
    const fileSize = formatFileSize(file.size);
    const uploadTime = new Date(file.uploadTime).toLocaleString();
        
    fileItem.innerHTML = `
            <div class="file-info">
                <div class="file-icon">${fileIcon}</div>
                <div class="file-details">
                    <div class="file-name" title="${file.originalName}">${file.originalName}</div>
                    <div class="file-meta">
                        <span class="file-size">${fileSize}</span>
                        <span class="file-time">${uploadTime}</span>
                        <span class="file-uploader">by ${file.uploadedBy}</span>
                    </div>
                </div>
            </div>
            <div class="file-actions">
                <button class="btn-download" onclick="downloadFile('${file.filename}', '${file.originalName}')" title="Download">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                </button>
            </div>
        `;
        
    filesList.appendChild(fileItem);
  });
}

function getFileIcon(mimetype) {
  if (mimetype.startsWith('image/')) {
    return '🖼️';
  } else if (mimetype.startsWith('video/')) {
    return '🎥';
  } else if (mimetype.startsWith('audio/')) {
    return '🎵';
  } else if (mimetype.includes('pdf')) {
    return '📄';
  } else if (mimetype.includes('zip') || mimetype.includes('rar')) {
    return '📦';
  } else if (mimetype.includes('text')) {
    return '📝';
  } else {
    return '📎';
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function downloadFile(filename, originalName) {
  const link = document.createElement('a');
  link.href = `/download/${filename}`;
  link.download = originalName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Socket event for file sharing
socket.on('file-shared', (fileInfo) => {
  sharedFiles.set(fileInfo.id, fileInfo);
    
  // Add system message about new file
  const fileMessage = {
    id: Date.now(),
    nickname: fileInfo.uploadedBy,
    text: `Shared a file: ${fileInfo.originalName}`,
    timestamp: fileInfo.uploadTime,
    type: 'file',
    fileInfo: fileInfo
  };
    
  appendMessage(fileMessage);
  scrollToBottom();
    
  // Refresh files panel if visible
  if (filesPanel.style.display === 'block') {
    loadSharedFiles();
  }
});

// Files history
socket.on('files-history', (files) => {
  files.forEach(file => {
    sharedFiles.set(file.id, file);
  });
    
  if (filesPanel.style.display === 'block') {
    displaySharedFiles(files);
  }
});

// Fetch room counts on load
fetch('/api/rooms')
  .then(res => res.json())
  .then(rooms => {
    rooms.forEach(room => {
      const countEl = document.getElementById(`count-${room.name}`);
      if (countEl) countEl.textContent = room.userCount;
    });
  });
