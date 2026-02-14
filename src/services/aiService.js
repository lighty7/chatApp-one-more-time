const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://192.168.30.5:11434';

class AIService {
  constructor() {
    this.ollamaHost = OLLAMA_HOST;
  }

  async getModels() {
    try {
      const response = await fetch(`${this.ollamaHost}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Error fetching Ollama models:', error);
      return [];
    }
  }

  async chat(message, model, history = []) {
    try {
      const response = await fetch(`${this.ollamaHost}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            ...history.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            { role: 'user', content: message }
          ],
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        message: data.message.content,
        model: data.model,
        done: data.done
      };
    } catch (error) {
      console.error('Error in AI chat:', error);
      throw error;
    }
  }

  async *streamChat(message, model, history = [], signal) {
    const controller = new AbortController();
    const abortSignal = signal || controller.signal;
    
    let aborted = false;
    const abortHandler = () => {
      aborted = true;
      controller.abort();
    };
    
    if (signal) {
      signal.addEventListener('abort', abortHandler);
    }

    try {
      const response = await fetch(`${this.ollamaHost}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortSignal,
        body: JSON.stringify({
          model,
          messages: [
            ...history.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            { role: 'user', content: message }
          ],
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        if (aborted) break;
        
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (aborted) break;
          
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              yield data.message.content;
            }
            if (data.done) {
              return;
            }
          } catch (e) {
            console.error('Error parsing chunk:', e);
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      console.error('Error in streaming AI chat:', error);
      throw error;
    } finally {
      if (signal) {
        signal.removeEventListener('abort', abortHandler);
      }
    }
  }
}

module.exports = new AIService();
