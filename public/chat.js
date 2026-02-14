const API_URL = window.location.origin;

class ChatApp {
  constructor() {
    this.socket = null;
    this.currentUser = null;
    this.currentConversation = null;
    this.currentRoom = null;
    this.isRoom = true;
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
    this.conversations = [];
    this.onlineUsers = new Set();
    this.typingTimeout = null;
    this.heartbeatInterval = null;

    this.init();
  }

  async init() {
    this.setupEventListeners();
    
    if (this.accessToken) {
      try {
        await this.verifyToken();
        this.showChat();
      } catch (error) {
        this.showAuth();
      }
    } else {
      this.showAuth();
    }
  }

  setupEventListeners() {
    document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
    document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));
    
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchAuthTab(tab.dataset.tab));
    });
    
    document.querySelectorAll('.switch-tab').forEach(btn => {
      btn.addEventListener('click', () => this.switchAuthTab(btn.dataset.tab));
    });

    document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());

    document.getElementById('roomList').addEventListener('click', (e) => {
      const roomItem = e.target.closest('.room-item');
      if (roomItem) this.joinRoom(roomItem.dataset.room);
    });

    document.getElementById('messageForm').addEventListener('submit', (e) => this.sendMessage(e));
    
    document.getElementById('messageInput').addEventListener('input', () => this.handleTyping());
    document.getElementById('messageInput').addEventListener('blur', () => this.stopTyping());

    document.getElementById('fileBtn').addEventListener('click', () => {
      document.getElementById('fileInput').click();
    });
    
    document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileUpload(e));

    document.getElementById('userSearchInput').addEventListener('input', (e) => this.searchUsers(e.target.value));
    document.getElementById('searchResults').addEventListener('click', (e) => {
      const userItem = e.target.closest('.search-user-item');
      if (userItem) this.startDirectMessage(userItem.dataset.userId);
    });

    document.getElementById('createGroupBtn').addEventListener('click', () => this.showCreateGroupModal());
    document.getElementById('cancelGroupBtn').addEventListener('click', () => this.hideCreateGroupModal());
    document.getElementById('createGroupForm').addEventListener('submit', (e) => this.createGroup(e));

    document.getElementById('filesToggle').addEventListener('click', () => this.toggleFilesPanel());
    document.getElementById('toggleFiles').addEventListener('click', () => this.toggleFilesPanel());

    const mobileToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (mobileToggle) {
      mobileToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
      });
    }

    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
      });
    }
  }

  showAuth() {
    document.getElementById('authModal').style.display = 'flex';
    document.getElementById('chatContainer').style.display = 'none';
  }

  showChat() {
    document.getElementById('authModal').style.display = 'none';
    document.getElementById('chatContainer').style.display = 'flex';
    this.connectSocket();
    this.loadConversations();
    this.loadRooms();
  }

  switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

    document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
    document.getElementById('authError').textContent = '';
  }

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('authError');

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      this.accessToken = data.accessToken;
      this.refreshToken = data.refreshToken;
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      
      this.currentUser = data.user;
      this.showChat();
    } catch (error) {
      errorEl.textContent = error.message;
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const displayName = document.getElementById('regDisplayName').value;
    const password = document.getElementById('regPassword').value;
    const errorEl = document.getElementById('authError');

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, displayName })
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      this.accessToken = data.accessToken;
      this.refreshToken = data.refreshToken;
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      
      this.currentUser = data.user;
      this.showChat();
    } catch (error) {
      errorEl.textContent = error.message;
    }
  }

  async handleLogout() {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
    } catch (e) {}

    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
    if (this.socket) this.socket.disconnect();
    
    this.currentUser = null;
    this.currentConversation = null;
    this.currentRoom = null;
    this.showAuth();
  }

  async verifyToken() {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${this.accessToken}` }
    });

    if (!res.ok) {
      if (this.refreshToken) {
        await this.refreshAccessToken();
      } else {
        throw new Error('Invalid token');
      }
    } else {
      this.currentUser = await res.json();
    }
  }

  async refreshAccessToken() {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken })
    });

    if (!res.ok) throw new Error('Token refresh failed');

    const data = await res.json();
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    this.currentUser = data.user;
  }

  connectSocket() {
    this.socket = io({
      auth: { token: this.accessToken }
    });

    this.socket.on('authenticated', (data) => {
      console.log('WebSocket authenticated');
      this.startHeartbeat();
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected:', reason);
      this.stopHeartbeat();
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    this.setupSocketListeners();
  }

  setupSocketListeners() {
    this.socket.on('new-message', (message) => this.handleNewMessage(message));
    this.socket.on('room-message', (message) => this.handleRoomMessage(message));
    this.socket.on('user-joined-room', (data) => this.handleUserJoined(data));
    this.socket.on('user-left-room', (data) => this.handleUserLeft(data));
    this.socket.on('room-message', (message) => this.displayRoomMessage(message));
    
    this.socket.on('user-typing', (data) => this.showTypingIndicator(data));
    this.socket.on('user-stop-typing', (data) => this.hideTypingIndicator(data));
    
    this.socket.on('presence:online', (data) => this.handlePresenceChange(data, true));
    this.socket.on('presence:offline', (data) => this.handlePresenceChange(data, false));
    this.socket.on('presence:user-status', (data) => this.handleUserStatusChange(data));

    this.socket.on('file-shared', (file) => this.handleFileShared(file));
    this.socket.on('files-history', (files) => this.displayFiles(files));
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.socket.emit('heartbeat');
    }, 5000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  async loadConversations() {
    try {
      const res = await fetch(`${API_URL}/api/conversations`, {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      });
      this.conversations = await res.json();
      this.renderConversations();
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  }

  renderConversations() {
    const dmList = document.getElementById('dmList');
    dmList.innerHTML = '';

    this.conversations.forEach(conv => {
      const displayName = conv.displayName || conv.name || 'Unknown';
      const li = document.createElement('li');
      li.className = 'conversation-item';
      li.dataset.conversationId = conv._id;
      li.innerHTML = `
        <span class="conv-avatar">${displayName.charAt(0).toUpperCase()}</span>
        <span class="conv-name">${displayName}</span>
        ${conv.unreadCount > 0 ? `<span class="unread-badge">${conv.unreadCount}</span>` : ''}
      `;
      li.addEventListener('click', () => this.joinConversation(conv._id));
      dmList.appendChild(li);
    });
  }

  async loadRooms() {
    try {
      const res = await fetch(`${API_URL}/api/rooms`);
      const rooms = await res.json();
      rooms.forEach(room => {
        const countEl = document.getElementById(`count-${room.name}`);
        if (countEl) countEl.textContent = room.userCount || 0;
      });
    } catch (error) {
      console.error('Error loading rooms:', error);
    }
  }

  async joinRoom(roomName) {
    this.isRoom = true;
    this.currentRoom = roomName;
    this.currentConversation = null;

    document.querySelectorAll('.room-item').forEach(r => r.classList.remove('active'));
    document.querySelectorAll('.conversation-item').forEach(c => c.classList.remove('active'));
    document.querySelector(`[data-room="${roomName}"]`)?.classList.add('active');

    document.getElementById('currentRoom').textContent = roomName;
    document.getElementById('roomInfo').innerHTML = `<span class="room-hash">#</span><span>${roomName}</span>`;
    document.getElementById('chatTypeBadge').textContent = 'Room';
    document.getElementById('messageInput').disabled = false;
    document.querySelector('.btn-send').disabled = false;

    this.socket.emit('join-room', { roomName }, (response) => {
      if (response.success) {
        this.displayMessages(response.messages || []);
        this.updateRoomUsers(response.users || []);
      }
    });

    this.loadRoomFiles(roomName);
    this.hideWelcome();
  }

  async joinConversation(conversationId) {
    this.isRoom = false;
    this.currentConversation = conversationId;
    this.currentRoom = null;

    document.querySelectorAll('.room-item').forEach(r => r.classList.remove('active'));
    document.querySelectorAll('.conversation-item').forEach(c => c.classList.remove('active'));
    document.querySelector(`[data-conversation-id="${conversationId}"]`)?.classList.add('active');

    const conv = this.conversations.find(c => c._id === conversationId);
    if (conv) {
      document.getElementById('roomInfo').innerHTML = `
        <span class="conv-avatar-small">${conv.displayName?.charAt(0).toUpperCase() || '?'}</span>
        <span>${conv.displayName}</span>
      `;
      document.getElementById('chatTypeBadge').textContent = conv.type === 'direct' ? 'Direct Message' : 'Group';
    }

    document.getElementById('messageInput').disabled = false;
    document.querySelector('.btn-send').disabled = false;

    this.socket.emit('join-conversation', { conversationId }, (response) => {
      if (response.success) {
        this.displayMessages(response.messages || []);
      }
    });

    this.hideWelcome();
  }

  async startDirectMessage(userId) {
    document.getElementById('searchResults').style.display = 'none';
    document.getElementById('userSearchInput').value = '';

    try {
      const res = await fetch(`${API_URL}/api/conversations/direct`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({ userId })
      });

      if (!res.ok) throw new Error('Failed to create conversation');
      
      const conversation = await res.json();
      await this.loadConversations();
      this.joinConversation(conversation._id);
    } catch (error) {
      console.error('Error starting DM:', error);
    }
  }

  async searchUsers(query) {
    const resultsEl = document.getElementById('searchResults');
    
    if (!query || query.length < 2) {
      resultsEl.style.display = 'none';
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/users?q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      });
      const users = await res.json();

      resultsEl.innerHTML = users
        .filter(u => u._id !== this.currentUser?._id)
        .map(u => `
          <div class="search-user-item" data-user-id="${u._id}">
            <span class="user-avatar">${u.username.charAt(0).toUpperCase()}</span>
            <span class="user-info">
              <span class="user-name">${u.displayName || u.username}</span>
              <span class="user-status ${u.isOnline ? 'online' : 'offline'}">${u.isOnline ? 'Online' : 'Offline'}</span>
            </span>
          </div>
        `).join('');
      
      resultsEl.style.display = users.length ? 'block' : 'none';
    } catch (error) {
      console.error('Error searching users:', error);
    }
  }

  async showCreateGroupModal() {
    document.getElementById('createGroupModal').style.display = 'flex';
    
    try {
      const res = await fetch(`${API_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      });
      const users = await res.json();

      const select = document.getElementById('groupParticipants');
      select.innerHTML = users
        .filter(u => u._id !== this.currentUser?._id)
        .map(u => `<option value="${u._id}">${u.displayName || u.username}</option>`)
        .join('');
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  hideCreateGroupModal() {
    document.getElementById('createGroupModal').style.display = 'none';
    document.getElementById('createGroupForm').reset();
  }

  async createGroup(e) {
    e.preventDefault();
    const name = document.getElementById('groupName').value;
    const description = document.getElementById('groupDescription').value;
    const select = document.getElementById('groupParticipants');
    const participantIds = Array.from(select.selectedOptions).map(o => o.value);

    try {
      const res = await fetch(`${API_URL}/api/conversations/group`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({ name, description, participantIds })
      });

      if (!res.ok) throw new Error('Failed to create group');
      
      const conversation = await res.json();
      await this.loadConversations();
      this.hideCreateGroupModal();
      this.joinConversation(conversation._id);
    } catch (error) {
      console.error('Error creating group:', error);
    }
  }

  sendMessage(e) {
    e.preventDefault();
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    
    if (!content) return;

    if (this.isRoom && this.currentRoom) {
      this.socket.emit('send-room-message', {
        roomName: this.currentRoom,
        content
      }, (response) => {
        if (response.success) {
          input.value = '';
          this.stopTyping();
        }
      });
    } else if (this.currentConversation) {
      this.socket.emit('send-message', {
        conversationId: this.currentConversation,
        content
      }, (response) => {
        if (response.success) {
          input.value = '';
          this.stopTyping();
        }
      });
    }
  }

  handleTyping() {
    if (this.isRoom && this.currentRoom) {
      this.socket.emit('send-room-typing', { roomName: this.currentRoom });
    } else if (this.currentConversation) {
      this.socket.emit('typing', { conversationId: this.currentConversation });
    }

    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => this.stopTyping(), 2000);
  }

  stopTyping() {
    if (this.isRoom && this.currentRoom) {
      this.socket.emit('send-room-stop-typing', { roomName: this.currentRoom });
    } else if (this.currentConversation) {
      this.socket.emit('stop-typing', { conversationId: this.currentConversation });
    }
  }

  async handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const progressEl = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    progressEl.style.display = 'block';
    progressText.textContent = 'Uploading...';

    try {
      const endpoint = this.currentConversation 
        ? `${API_URL}/api/files/upload?conversationId=${this.currentConversation}`
        : this.currentRoom
          ? `${API_URL}/api/files/upload?roomId=${this.currentRoom}`
          : `${API_URL}/api/files/upload`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.accessToken}` },
        body: formData
      });

      if (!res.ok) throw new Error('Upload failed');

      const fileData = await res.json();
      
      if (this.currentConversation) {
        this.socket.emit('send-message', {
          conversationId: this.currentConversation,
          content: `Shared a file: ${fileData.originalName}`,
          type: 'file',
          attachmentId: fileData._id
        });
      } else if (this.currentRoom) {
        this.socket.emit('send-room-message', {
          roomName: this.currentRoom,
          content: `Shared a file: ${fileData.originalName}`
        });
      }

      progressText.textContent = 'Upload complete!';
      setTimeout(() => progressEl.style.display = 'none', 2000);
    } catch (error) {
      progressText.textContent = 'Upload failed';
      setTimeout(() => progressEl.style.display = 'none', 2000);
    }

    e.target.value = '';
  }

  handleNewMessage(message) {
    if (this.currentConversation === message.conversationId) {
      this.displayMessage(message);
    }
    this.updateConversationLastMessage(message);
  }

  handleRoomMessage(message) {
    if (this.currentRoom === message.roomName) {
      this.displayRoomMessage(message);
    }
  }

  displayMessages(messages) {
    const container = document.getElementById('messages');
    container.innerHTML = '';
    messages.forEach(msg => this.displayMessage(msg));
  }

  displayMessage(message) {
    const container = document.getElementById('messages');
    const isOwn = message.sender._id === this.currentUser?._id;
    
    const div = document.createElement('div');
    div.className = `message ${isOwn ? 'own' : ''}`;
    div.innerHTML = `
      ${!isOwn ? `<span class="message-author">${message.sender.displayName || message.sender.username}</span>` : ''}
      <p class="message-content">${this.escapeHtml(message.content)}</p>
      <span class="message-time">${this.formatTime(message.createdAt)}</span>
    `;
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  displayRoomMessage(message) {
    const container = document.getElementById('messages');
    const isOwn = message.sender.userId === this.currentUser?._id;
    
    const div = document.createElement('div');
    div.className = `message ${isOwn ? 'own' : ''}`;
    div.innerHTML = `
      ${!isOwn ? `<span class="message-author">User</span>` : ''}
      <p class="message-content">${this.escapeHtml(message.content)}</p>
      <span class="message-time">${this.formatTime(message.timestamp)}</span>
    `;
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  handleUserJoined(data) {
    this.updateRoomUsers(data.users);
  }

  handleUserLeft(data) {
    this.updateRoomUsers(data.users);
  }

  updateRoomUsers(users) {
    document.getElementById('onlineCount').textContent = `(${users.length})`;
  }

  showTypingIndicator(data) {
    const indicator = document.getElementById('typingIndicator');
    const text = document.getElementById('typingText');
    text.textContent = 'Someone is typing...';
    indicator.style.display = 'flex';
  }

  hideTypingIndicator() {
    document.getElementById('typingIndicator').style.display = 'none';
  }

  handlePresenceChange(data, isOnline) {
    if (isOnline) {
      this.onlineUsers.add(data.userId);
    } else {
      this.onlineUsers.delete(data.userId);
    }
  }

  handleUserStatusChange(data) {
    if (data.status === 'online') {
      this.onlineUsers.add(data.userId);
    } else {
      this.onlineUsers.delete(data.userId);
    }
  }

  async loadRoomFiles(roomName) {
    try {
      const res = await fetch(`${API_URL}/api/files/room/${roomName}`);
      const files = await res.json();
      this.displayFiles(files);
    } catch (error) {
      console.error('Error loading files:', error);
    }
  }

  displayFiles(files) {
    const list = document.getElementById('filesList');
    list.innerHTML = files.map(f => `
      <div class="file-item">
        <span class="file-icon">📄</span>
        <span class="file-name">${f.originalName}</span>
        <a href="${f.url}" target="_blank" class="file-download">Download</a>
      </div>
    `).join('');
  }

  handleFileShared(file) {
    this.loadRoomFiles(this.currentRoom);
  }

  toggleFilesPanel() {
    const panel = document.getElementById('filesPanel');
    const toggle = document.getElementById('filesToggle');
    
    if (panel.style.display === 'none') {
      panel.style.display = 'block';
      toggle.style.display = 'none';
    } else {
      panel.style.display = 'none';
      toggle.style.display = 'flex';
    }
  }

  hideWelcome() {
    document.getElementById('welcomeMessage').style.display = 'none';
  }

  updateConversationLastMessage(message) {
    const conv = this.conversations.find(c => c._id === message.conversationId);
    if (conv) {
      conv.lastMessage = message;
      this.renderConversations();
    }
  }

  formatTime(date) {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.chatApp = new ChatApp();
});
