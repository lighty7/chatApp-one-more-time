# AI Chat - Detailed

Comprehensive documentation for ChatterBox AI chat features.

## Overview

ChatterBox includes an AI assistant powered by large language models. The AI can:
- Answer questions
- Help with code writing
- Provide explanations
- Have contextual conversations

## Features

### Streaming Responses

AI responses are streamed in real-time, providing:
- Faster perceived response time
- Progressive content display
- Better user experience

### Abort Controller

Users can stop AI responses mid-stream using the abort controller feature:
- Immediate response termination
- Resource optimization
- User control

### Context-Aware

The AI maintains conversation context:
- Remembers previous messages
- Provides consistent responses
- Understands follow-up questions

---

## Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `AI_ENABLED` | Enable AI features | No | `false` |
| `AI_PROVIDER` | AI provider | No | `openai` |
| `AI_MODEL` | Model to use | No | `gpt-3.5-turbo` |
| `AI_API_KEY` | API key | Yes* | - |
| `AI_TEMPERATURE` | Response creativity | No | `0.7` |
| `AI_MAX_TOKENS` | Max response length | No | `1000` |

*Required when `AI_ENABLED=true`

### Supported Providers

- **OpenAI**: GPT-3.5, GPT-4
- **Anthropic**: Claude (future)
- **Custom**: Configurable endpoint

---

## Usage

### WebSocket Events

#### Send AI Message

```javascript
socket.emit('ai-message', {
  conversationId: 'conv-123',
  content: 'Explain what is Node.js'
});
```

#### Stop Streaming

```javascript
socket.emit('ai-stop', {
  conversationId: 'conv-123'
});
```

### Receiving Responses

#### Stream (Partial Responses)

```javascript
socket.on('ai-stream', (data) => {
  console.log('Partial:', data.content);
  // Accumulates as response streams in
});
```

#### Complete (Full Response)

```javascript
socket.on('ai-complete', (data) => {
  console.log('Full response:', data.content);
});
```

#### Error Handling

```javascript
socket.on('ai-error', (error) => {
  console.error('AI Error:', error.message);
});
```

---

## Implementation Details

### Service Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client    │────▶│  WebSocket   │────▶│ AI Service  │
│  (Socket)   │     │   Handler    │     │             │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                 │
                                                 ▼
                                        ┌─────────────┐
                                        │  AI Provider│
                                        │  (OpenAI)   │
                                        └─────────────┘
```

### Code Location

- **Handler**: `src/websocket/handlers/chat.js`
- **Service**: `src/services/aiService.js`
- **Route**: `src/api/routes/ai.js`

### Key Functions

#### sendMessageToAI

```javascript
async function sendMessageToAI(conversationId, userMessage, callback) {
  // Get conversation history
  const history = await getConversationHistory(conversationId);
  
  // Build prompt with context
  const prompt = buildPrompt(history, userMessage);
  
  // Stream response
  const stream = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: prompt,
    stream: true
  });
  
  for await (const chunk of stream) {
    callback(chunk.choices[0].delta.content);
  }
}
```

#### abortController

```javascript
class AIRequestManager {
  constructor() {
    this.activeRequests = new Map();
  }
  
  createRequest(conversationId, abortController) {
    this.activeRequests.set(conversationId, abortController);
  }
  
  abortRequest(conversationId) {
    const controller = this.activeRequests.get(conversationId);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(conversationId);
    }
  }
}
```

---

## Best Practices

### Rate Limiting

- Implement per-user rate limits
- Use Redis for distributed rate limiting
- Set reasonable token limits

### Error Handling

- Handle API key errors
- Handle rate limit errors
- Handle timeout errors
- Provide user-friendly error messages

### Security

- Never expose API keys in client code
- Validate user input
- Sanitize AI responses
- Implement content filtering

---

## Testing

### Unit Tests

```bash
npm test -- --grep "AI"
```

### Manual Testing

1. Enable AI in environment
2. Start server
3. Connect via WebSocket
4. Send AI message
5. Verify streaming response

---

## Related Documentation

- [WebSocket Events](WEBSOCKET.md)
- [Features](FEATURES.md)
- [Security](SECURITY.md)
