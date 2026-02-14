# AI Chat Overview

Quick overview of AI chat features. See [AI-CHAT-detailed.md](AI-CHAT-detailed.md) for comprehensive documentation.

## Features

- **Streaming Responses**: Real-time AI response delivery
- **Abort Controller**: Stop responses mid-stream
- **Context-Aware**: Maintains conversation history

## Quick Start

```javascript
// Send message
socket.emit('ai-message', {
  conversationId: 'conv-123',
  content: 'Help me write code'
});

// Stop streaming
socket.emit('ai-stop', {
  conversationId: 'conv-123'
});
```

## Configuration

Set `AI_ENABLED=true` and provide `AI_API_KEY` in environment.

## Quick Links

- [Detailed AI Chat](AI-CHAT-detailed.md)
- [WebSocket Events](WEBSOCKET.md)
