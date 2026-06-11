import { Router, Request, Response } from 'express';
import { streamChat, chat, ChatRequest } from '../services/anthropic';

const router = Router();

// POST /api/chat — SSE streaming endpoint
router.post('/chat', async (req: Request, res: Response) => {
  const body = req.body as ChatRequest & { stream?: boolean };

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    res.status(400).json({ error: 'messages array is required' });
    return;
  }

  const useStream = body.stream !== false; // default true

  if (useStream) {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // nginx buffering off
    res.flushHeaders();

    await streamChat(body, {
      onChunk(text) {
        res.write(`data: ${JSON.stringify({ type: 'chunk', text })}\n\n`);
      },
      onDone(fullText) {
        res.write(`data: ${JSON.stringify({ type: 'done', text: fullText })}\n\n`);
        res.end();
      },
      onError(error) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
        res.end();
      },
    });
  } else {
    try {
      const result = await chat(body);
      res.json({ text: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: message });
    }
  }
});

export default router;
