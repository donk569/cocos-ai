import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRouter from './routes/chat';

dotenv.config();

const PORT = parseInt(process.env.PROXY_PORT || '3099', 10);

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/api', chatRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[Claude Proxy] Server running on http://localhost:${PORT}`);
  console.log(`[Claude Proxy] Endpoints:`);
  console.log(`  POST http://localhost:${PORT}/api/chat  (SSE streaming)`);
  console.log(`  GET  http://localhost:${PORT}/api/health`);
});
