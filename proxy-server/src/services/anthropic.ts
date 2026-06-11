import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('[Claude Proxy] ANTHROPIC_API_KEY not set in .env file');
  process.exit(1);
}

// DeepSeek API — OpenAI-compatible
const API_BASE = process.env.API_BASE || 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-chat';
const DEFAULT_MAX_TOKENS = 4096;

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  max_tokens?: number;
  system?: string;
}

/**
 * Build messages array with optional system prompt.
 */
function buildMessages(req: ChatRequest): ChatMessage[] {
  const messages: ChatMessage[] = [];
  if (req.system) {
    messages.push({ role: 'system', content: req.system });
  }
  messages.push(...req.messages);
  return messages;
}

/**
 * Stream a chat completion from DeepSeek API.
 * Uses SSE streaming (OpenAI-compatible format).
 */
export async function streamChat(
  req: ChatRequest,
  callbacks: {
    onChunk: (text: string) => void;
    onDone: (fullText: string) => void;
    onError: (error: Error) => void;
  }
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: req.model || DEFAULT_MODEL,
        max_tokens: req.max_tokens || DEFAULT_MAX_TOKENS,
        messages: buildMessages(req),
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`DeepSeek API error ${response.status}: ${errorBody}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.substring(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            callbacks.onChunk(delta);
          }
        } catch {
          // Skip unparseable lines
        }
      }
    }

    callbacks.onDone(fullText);
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Simple non-streaming chat.
 */
export async function chat(req: ChatRequest): Promise<string> {
  const response = await fetch(`${API_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: req.model || DEFAULT_MODEL,
      max_tokens: req.max_tokens || DEFAULT_MAX_TOKENS,
      messages: buildMessages(req),
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`DeepSeek API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content || '';
}
