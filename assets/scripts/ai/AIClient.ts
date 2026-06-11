import { _decorator } from 'cc';

const { ccclass } = _decorator;

const DEFAULT_PROXY_URL = 'http://localhost:3099';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamCallbacks {
  onChunk?: (text: string) => void;
  onDone?: (fullText: string) => void;
  onError?: (error: string) => void;
}

/**
 * HTTP client for the local Claude proxy server.
 * Use AIClient.instance to get the singleton.
 */
@ccclass('AIClient')
export class AIClient {
  private static _instance: AIClient | null = null;
  private _proxyUrl: string = DEFAULT_PROXY_URL;
  private _systemPrompt: string =
    'You are a helpful AI assistant in a mobile baseball game called Flyball. Keep responses concise, friendly, and under 200 words when possible.';

  static get instance(): AIClient {
    if (!AIClient._instance) {
      AIClient._instance = new AIClient();
    }
    return AIClient._instance;
  }

  /** Override the proxy URL (e.g., for production) */
  setProxyUrl(url: string): void {
    this._proxyUrl = url;
  }

  /** Override the system prompt */
  setSystemPrompt(prompt: string): void {
    this._systemPrompt = prompt;
  }

  /**
   * Send a chat message with SSE streaming support.
   * Returns the full response text via onDone callback.
   */
  async chatStream(
    messages: ChatMessage[],
    callbacks: StreamCallbacks = {}
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      let fullText = '';
      let lastIndex = 0;

      xhr.open('POST', `${this._proxyUrl}/api/chat`, true);
      xhr.setRequestHeader('Content-Type', 'application/json');

      xhr.onprogress = () => {
        const newData = xhr.responseText.substring(lastIndex);
        lastIndex = xhr.responseText.length;

        // Parse SSE data lines
        const lines = newData.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.substring(6));
              if (parsed.type === 'chunk') {
                fullText += parsed.text;
                callbacks.onChunk?.(parsed.text);
              } else if (parsed.type === 'done') {
                fullText = parsed.text;
                callbacks.onDone?.(fullText);
                resolve(fullText);
              } else if (parsed.type === 'error') {
                callbacks.onError?.(parsed.error);
                reject(new Error(parsed.error));
              }
            } catch (_e) {
              // Partial line, ignore parse errors during streaming
            }
          }
        }
      };

      xhr.onerror = () => {
        const err = 'Network error connecting to Claude proxy';
        callbacks.onError?.(err);
        reject(new Error(err));
      };

      xhr.ontimeout = () => {
        const err = 'Request timed out';
        callbacks.onError?.(err);
        reject(new Error(err));
      };

      xhr.timeout = 30000;

      xhr.send(
        JSON.stringify({
          messages,
          system: this._systemPrompt,
          stream: true,
        })
      );
    });
  }

  /**
   * Simple non-streaming chat. Returns the response text.
   */
  async chat(messages: ChatMessage[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this._proxyUrl}/api/chat`, true);
      xhr.setRequestHeader('Content-Type', 'application/json');

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data.text || '');
          } catch {
            reject(new Error('Failed to parse response'));
          }
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error'));
      xhr.timeout = 15000;
      xhr.send(
        JSON.stringify({
          messages,
          system: this._systemPrompt,
          stream: false,
        })
      );
    });
  }
}
