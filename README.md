<p align="center">
  <img src="https://img.icons8.com/fluency/96/chat.png" alt="ChatterBox Logo" width="80"/>
</p>

<h1 align="center">ChatterBox</h1>

<p align="center">
  <strong>A modern, real-time chat application built with Socket.io</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#demo">Demo</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen" alt="Node Version"/>
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License"/>
  <img src="https://img.shields.io/badge/PRs-welcome-orange" alt="PRs Welcome"/>
</p>

---

## ✨ Features

| Feature                    | Description                                       |
| -------------------------- | ------------------------------------------------- |
| 🏠 **Multiple Rooms**      | Switch between chat rooms (general, random, tech) |
| 💬 **Real-time Messaging** | Instant message delivery using WebSockets         |
| 📜 **Message History**     | Last 50 messages stored per room                  |
| ⌨️ **Typing Indicators**   | See when others are typing                        |
| 👤 **User Nicknames**      | Custom display names for each user                |
| 📎 **File Sharing**        | Share images and videos (mobile optimized)         |
| 🌙 **Dark Theme**          | Beautiful modern UI with glassmorphism            |
| 📱 **Mobile Optimized**    | Perfect for mobile devices with responsive design |

## 🎥 Demo

1. Open the app in multiple browser tabs
2. Enter different nicknames
3. Join rooms and start chatting!

## 🚀 Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/Qugates/chatterbox.git

# Navigate to project directory
cd chatterbox

# Install dependencies
npm install

# Start the server
npm start
```

The app will be running at **http://localhost:10000** 🎉

## 🚀 Quick Deploy to Render (Free)

1. Fork this repository
2. Go to [render.com](https://render.com)
3. Connect your GitHub account
4. Click "New +" → "Web Service"
5. Select your forked repository
6. Use these settings:
   - **Name**: chatterbox
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

Your app will be live at `https://your-app-name.onrender.com` 🎉

## 📱 Mobile Features

- ✅ **Mobile-optimized responsive design**
- ✅ **Hamburger menu for sidebar**
- ✅ **Touch-friendly buttons**
- ✅ **Image and video file sharing**
- ✅ **Mobile file upload interface**

## 💡 Usage

### Starting the Server

```bash
# Production
npm start

# Development
npm run dev
```

### Environment Variables

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `PORT`   | `10000`  | Server port (Render auto-sets this) |

### API Endpoints

| Method | Endpoint     | Description                          |
| ------ | ------------ | ------------------------------------ |
| GET    | `/`          | Serve chat application               |
| GET    | `/api`       | Health check                         |
| GET    | `/api/rooms` | Get available rooms with user counts |

### Socket Events

**Client → Server:**
| Event | Payload | Description |
|-------|---------|-------------|
| `set-nickname` | `string` | Set user's display name |
| `join-room` | `string` | Join a chat room |
| `send-message` | `{ text: string }` | Send a message |
| `typing` | - | Notify others you're typing |
| `stop-typing` | - | Stop typing notification |

**Server → Client:**
| Event | Payload | Description |
|-------|---------|-------------|
| `message-history` | `Message[]` | Previous messages in room |
| `new-message` | `Message` | New message received |
| `user-joined` | `{ nickname, room }` | User joined notification |
| `user-left` | `{ nickname, room }` | User left notification |
| `room-users` | `User[]` | Current users in room |
| `user-typing` | `{ nickname }` | Someone is typing |
| `user-stop-typing` | `{ nickname }` | Someone stopped typing |

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Real-time:** Socket.io
- **Frontend:** Vanilla HTML/CSS/JS
- **Testing:** Mocha + Supertest

## 📁 Project Structure

```
chatterbox/
├── server.js           # Express + Socket.io server
├── public/
│   ├── index.html      # Chat interface
│   ├── style.css       # Dark theme styles
│   └── chat.js         # Socket.io client logic
├── tests/
│   └── server.test.js  # API tests
├── package.json
├── Dockerfile
└── README.md
```

## 🐳 Docker

```bash
# Build image
docker build -t chatterbox .

# Run container
docker run -p 5000:5000 chatterbox
```

## 🧪 Testing

```bash
npm test
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Socket.io](https://socket.io/) for real-time communication
- [Express.js](https://expressjs.com/) for the web framework
- [Icons8](https://icons8.com/) for the logo

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/Qugates">Qugates</a>
</p>
