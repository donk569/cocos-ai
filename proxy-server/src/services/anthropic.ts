import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('[Claude Proxy] ANTHROPIC_API_KEY not set in .env file');
  process.exit(1);
}

const client = new Anthropic({ apiKey });

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const DEFAULT_MAX_TOKENS = 4096;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  max_tokens?: number;
  system?: string;
}

/**
 * Stream a chat completion from Anthropic.
 * Calls `onChunk(text)` for each text delta, `onDone(fullText)` on completion,
 * and `onError(err)` on failure.
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
    const stream = client.messages.stream({
      model: req.model || DEFAULT_MODEL,
      max_tokens: req.max_tokens || DEFAULT_MAX_TOKENS,
      system: req.system || 'You are a helpful AI assistant in a mobile game. Keep responses concise and friendly.',
      messages: req.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    let fullText = '';

    stream.on('text', (text: string) => {
      fullText += text;
      callbacks.onChunk(text);
    });

    stream.on('end', () => {
      callbacks.onDone(fullText);
    });

    stream.on('error', (error: Error) => {
      callbacks.onError(error);
    });
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Simple non-streaming chat (for editor use).
 */
export async function chat(req: ChatRequest): Promise<string> {
  const response = await client.messages.create({
    model: req.model || DEFAULT_MODEL,
    max_tokens: req.max_tokens || DEFAULT_MAX_TOKENS,
    system: req.system,
    messages: req.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  return textBlock?.text || '';
}
