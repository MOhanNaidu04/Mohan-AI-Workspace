import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, connect, closePool } from './db/db.js';
import { authMiddleware } from './db/auth.js';
import { registerUser, loginUser, getCurrentUser, updateUser } from './db/authRoutes.js';

const app = express();
const PORT = process.env.PORT || 4000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, 'dist');
const hasClientBuild = fs.existsSync(path.join(distDir, 'index.html'));

app.use(cors());
app.use(express.json());

if (hasClientBuild) {
  app.use(express.static(distDir));
}

// ── Request logging middleware ─────────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`[Server] ${req.method} ${req.path}`);
  next();
});

const replies = {
  marketing: 'Use customer outcomes, clear value, and a strong CTA for marketing copy.',
  sales: 'Keep it concise, benefits-led, and reference the customer pain point quickly.',
  hr: 'Build structure around role, culture, and evaluation criteria for HR content.',
  coding: 'Explain the issue clearly, propose steps, and reference the code context.',
  business: 'Focus on impact, growth metrics, and a measurable next action.',
};

// ── Authentication Endpoints ───────────────────────────────────────────────

// Register new user
app.post('/api/auth/register', registerUser);

// Login user
app.post('/api/auth/login', loginUser);

// Get current user (protected)
app.get('/api/auth/me', authMiddleware, getCurrentUser);

// Update user profile (protected)
app.put('/api/auth/profile', authMiddleware, updateUser);

// ── Health Check Endpoints ─────────────────────────────────────────────────

app.get('/api/status', (_req, res) => {
  console.log('[Server] Health check requested.');
  res.json({ status: 'ok', environment: 'development', timestamp: new Date().toISOString() });
});

app.get('/api/db/status', async (_req, res) => {
  try {
    const result = await query('SELECT NOW()');
    console.log('[Server] DB status check — connected. Server time:', result.rows[0].now);
    res.json({
      status: 'connected',
      database: 'celume_ai_workspace',
      timestamp: result.rows[0].now,
    });
  } catch (error) {
    console.error('[Server] DB status check failed:', error.message);
    res.status(500).json({ status: 'disconnected', error: error.message });
  }
});

// ── Chat Endpoints ─────────────────────────────────────────────────────────

app.post('/api/chat', authMiddleware, async (req, res) => {
  try {
    const { prompt, category } = req.body;
    const userId = req.user?.userId;

    // Validate request body
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      console.warn('[Server] POST /api/chat — missing or empty "prompt" field. userId:', userId);
      return res.status(400).json({ error: 'prompt is required and must be a non-empty string.' });
    }
    if (!category || typeof category !== 'string') {
      console.warn('[Server] POST /api/chat — missing or invalid "category" field. userId:', userId);
      return res.status(400).json({ error: 'category is required and must be a string.' });
    }
    if (!replies[category]) {
      console.warn('[Server] POST /api/chat — unknown category "%s". userId: %s', category, userId);
      return res.status(400).json({
        error: `Unknown category "${category}". Valid categories: ${Object.keys(replies).join(', ')}.`,
      });
    }

    console.log('[Server] POST /api/chat — userId: %s, category: %s, prompt: "%s"',
      userId, category, prompt.trim().slice(0, 60));

    const baseResponse = replies[category];
    const response = {
      answer: `${baseResponse} Here is a clean response for your prompt: ${prompt}`,
      category,
      createdAt: new Date().toISOString(),
    };

    // Save to database
    const chatQuery = `
      INSERT INTO chats (user_id, title, category_id, last_message, created_at, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, title, created_at;
    `;
    const chatResult = await query(chatQuery, [
      userId,
      prompt.trim().substring(0, 100),
      category,
      response.answer,
    ]);
    response.chatId = chatResult.rows[0].id;

    console.log('[Server] Chat saved to DB — chatId: %s', response.chatId);

    // Simulate a small processing delay
    setTimeout(() => res.json(response), 700);
  } catch (error) {
    console.error('[Server] POST /api/chat error:', error.message);
    res.status(500).json({ error: 'An internal server error occurred. Please try again.' });
  }
});

// Get all categories
app.get('/api/categories', async (_req, res) => {
  try {
    const result = await query('SELECT * FROM categories ORDER BY id');
    console.log('[Server] GET /api/categories — returning %d categories', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('[Server] GET /api/categories error:', error.message);
    res.status(500).json({ error: 'Failed to fetch categories. Please try again.' });
  }
});

// Get user chats (protected)
app.get('/api/chats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      console.warn('[Server] GET /api/chats — userId missing from token.');
      return res.status(401).json({ error: 'Unauthorized. Please log in again.' });
    }

    const result = await query(
      `SELECT c.*, ct.label as category_label 
       FROM chats c 
       LEFT JOIN categories ct ON c.category_id = ct.id 
       WHERE c.user_id = $1 
       ORDER BY c.updated_at DESC`,
      [userId]
    );
    console.log('[Server] GET /api/chats — userId: %s, returning %d chats', userId, result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('[Server] GET /api/chats error:', error.message);
    res.status(500).json({ error: 'Failed to fetch chats. Please try again.' });
  }
});

// Get chat messages (protected)
app.get('/api/chats/:chatId/messages', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user?.userId;

    if (!chatId || isNaN(Number(chatId))) {
      console.warn('[Server] GET /api/chats/:chatId/messages — invalid chatId "%s".', chatId);
      return res.status(400).json({ error: 'Invalid chat ID. Must be a numeric value.' });
    }

    const result = await query(
      'SELECT * FROM messages WHERE chat_id = $1 ORDER BY created_at ASC',
      [chatId]
    );
    console.log('[Server] GET /api/chats/%s/messages — userId: %s, returning %d messages',
      chatId, userId, result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('[Server] GET /api/chats/:chatId/messages error:', error.message);
    res.status(500).json({ error: 'Failed to fetch messages. Please try again.' });
  }
});

// Get prompt templates
app.get('/api/prompts', async (_req, res) => {
  try {
    const result = await query('SELECT * FROM prompt_templates ORDER BY created_at DESC');
    console.log('[Server] GET /api/prompts — returning %d templates', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('[Server] GET /api/prompts error:', error.message);
    res.status(500).json({ error: 'Failed to fetch prompt templates. Please try again.' });
  }
});

// Get user projects (protected)
app.get('/api/projects', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      console.warn('[Server] GET /api/projects — userId missing from token.');
      return res.status(401).json({ error: 'Unauthorized. Please log in again.' });
    }

    const result = await query(
      'SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    console.log('[Server] GET /api/projects — userId: %s, returning %d projects', userId, result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('[Server] GET /api/projects error:', error.message);
    res.status(500).json({ error: 'Failed to fetch projects. Please try again.' });
  }
});

// Get user tasks (protected)
app.get('/api/tasks', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      console.warn('[Server] GET /api/tasks — userId missing from token.');
      return res.status(401).json({ error: 'Unauthorized. Please log in again.' });
    }

    const result = await query(
      'SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    console.log('[Server] GET /api/tasks — userId: %s, returning %d tasks', userId, result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('[Server] GET /api/tasks error:', error.message);
    res.status(500).json({ error: 'Failed to fetch tasks. Please try again.' });
  }
});

// ── 404 catch-all ──────────────────────────────────────────────────────────
app.use((req, res) => {
  if (hasClientBuild && req.method === 'GET' && !req.path.startsWith('/api/') && req.accepts('html')) {
    return res.sendFile(path.join(distDir, 'index.html'));
  }

  console.warn('[Server] 404 — Route not found: %s %s', req.method, req.path);
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

app.use((err, _req, res, _next) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({ error: 'An unexpected server error occurred. Please try again later.' });
});

// ── Initialize server ──────────────────────────────────────────────────────
async function startServer() {
  try {
    const isConnected = await connect();

    if (!isConnected) {
      console.warn('[Server] Warning: Database not available — running in demo mode without persistence.');
    }

    app.listen(PORT, () => {
      console.log(`[Server] Backend listening on http://localhost:${PORT}`);
      if (isConnected) {
        console.log('[Server] Database: celume_ai_workspace — connected ✓');
      } else {
        console.log('[Server] Database: not connected — running in demo mode.');
      }
    });
  } catch (error) {
    console.error('[Server] Failed to start:', error.message);
    process.exit(1);
  }
}

// ── Graceful shutdown ──────────────────────────────────────────────────────
process.on('SIGINT', async () => {
  console.log('\n[Server] SIGINT received — shutting down gracefully...');
  await closePool();
  console.log('[Server] Database pool closed. Goodbye.');
  process.exit(0);
});

startServer();
