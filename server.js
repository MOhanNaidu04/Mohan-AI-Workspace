import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, connect, closePool } from './db/db.js';
import { authMiddleware } from './db/auth.js';
import { registerUser, loginUser, getCurrentUser, updateUser, deleteUser } from './db/authRoutes.js';

const app = express();
const PORT = process.env.PORT || 4000;
const LLM_BASE_URL = (process.env.LLM_BASE_URL || 'http://16.112.145.206:8000/v1').replace(/\/$/, '');
const LLM_MODEL = process.env.LLM_MODEL || '/models/gemma4-awq';
const LLM_TEMPERATURE = Number(process.env.LLM_TEMPERATURE || 0.3);
const LLM_MAX_COMPLETION_TOKENS = Number(process.env.LLM_MAX_COMPLETION_TOKENS || 256);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, 'dist');
const hasClientBuild = fs.existsSync(path.join(distDir, 'index.html'));

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
}));
app.options('*', cors());
app.use(express.json({ limit: '5mb' }));

if (hasClientBuild) {
  app.use(express.static(distDir));
}

// ── Request logging middleware ─────────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`[Server] ${req.method} ${req.path}`);
  next();
});

function buildSystemPrompt(category) {
  return [
    'You are Mohan-ai-workspace, a helpful assistant for business, marketing, HR, sales, and coding tasks.',
    `The current conversation category is "${category}".`,
    'Respond directly to the user prompt without adding canned demo text or placeholders.',
    'Answer clearly, directly, and keep the response useful and concise unless the user asks for more detail.',
  ].join(' ');
}

// ── Authentication Endpoints ───────────────────────────────────────────────

// Register new user
app.post('/api/auth/register', registerUser);

// Login user
app.post('/api/auth/login', loginUser);

// Get current user (protected)
app.get('/api/auth/me', authMiddleware, getCurrentUser);

// Update user profile (protected)
app.put('/api/auth/profile', authMiddleware, updateUser);

// Delete user account (protected)
app.delete('/api/auth/profile', authMiddleware, deleteUser);

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
    const { prompt, category, chatId } = req.body;
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
    console.log('[Server] POST /api/chat — userId: %s, category: %s, prompt: "%s"',
      userId, category, prompt.trim().slice(0, 60));

    const llmResponse = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.LLM_API_KEY ? { Authorization: `Bearer ${process.env.LLM_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        temperature: LLM_TEMPERATURE,
        max_completion_tokens: LLM_MAX_COMPLETION_TOKENS,
        messages: [
          { role: 'system', content: buildSystemPrompt(category) },
          { role: 'user', content: prompt.trim() },
        ],
      }),
    });

    const llmData = await llmResponse.json().catch(() => ({}));
    if (!llmResponse.ok) {
      console.error('[Server] LLM request failed:', llmData);
      return res.status(502).json({
        error: llmData.error?.message || llmData.error || 'Failed to get a response from the language model.',
      });
    }

    const answer =
      llmData?.choices?.[0]?.message?.content?.trim() ||
      llmData?.choices?.[0]?.text?.trim() ||
      '';

    if (!answer) {
      console.error('[Server] LLM returned an empty response:', llmData);
      return res.status(502).json({ error: 'The language model returned an empty response.' });
    }

    let resolvedChatId = chatId;

    if (resolvedChatId) {
      const ownershipCheck = await query(
        'SELECT id FROM chats WHERE id = $1 AND user_id = $2',
        [resolvedChatId, userId]
      );

      if (ownershipCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Chat not found.' });
      }
    } else {
      const chatQuery = `
        INSERT INTO chats (user_id, title, category_id, last_message, created_at, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, title, created_at;
      `;
      const chatResult = await query(chatQuery, [
        userId,
        prompt.trim().substring(0, 100),
        category,
        answer,
      ]);
      resolvedChatId = chatResult.rows[0].id;
      console.log('[Server] New chat created — chatId: %s', resolvedChatId);
    }

    await query(
      `INSERT INTO messages (chat_id, role, text)
       VALUES ($1, $2, $3), ($1, $4, $5)`,
      [resolvedChatId, 'user', prompt.trim(), 'assistant', answer]
    );

    await query(
      `UPDATE chats
       SET last_message = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [resolvedChatId, answer]
    );

    res.json({
      answer,
      category,
      chatId: resolvedChatId,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Server] POST /api/chat error:', error.message);
    res.status(500).json({ error: 'An internal server error occurred. Please try again.' });
  }
});

app.post('/api/chats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { title, category } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized. Please log in again.' });
    }

    const safeTitle = typeof title === 'string' && title.trim() ? title.trim() : 'New conversation';
    const safeCategory = typeof category === 'string' && category.trim() ? category.trim() : 'business';

    const result = await query(
      `INSERT INTO chats (user_id, title, category_id, last_message, created_at, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, title, category_id AS category, last_message, created_at, updated_at`,
      [userId, safeTitle, safeCategory, 'Start typing to begin...']
    );

    res.status(201).json({ chat: result.rows[0] });
  } catch (error) {
    console.error('[Server] POST /api/chats error:', error.message);
    res.status(500).json({ error: 'Failed to create chat. Please try again.' });
  }
});

app.delete('/api/chats/:chatId', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user?.userId;

    if (!chatId) {
      return res.status(400).json({ error: 'Invalid chat ID.' });
    }

    const ownershipCheck = await query('SELECT id FROM chats WHERE id = $1 AND user_id = $2', [chatId, userId]);
    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Chat not found.' });
    }

    await query('DELETE FROM messages WHERE chat_id = $1', [chatId]);
    await query('DELETE FROM chats WHERE id = $1 AND user_id = $2', [chatId, userId]);

    res.json({ success: true, chatId });
  } catch (error) {
    console.error('[Server] DELETE /api/chats/:chatId error:', error.message);
    res.status(500).json({ error: 'Failed to delete chat. Please try again.' });
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

    if (!chatId) {
      console.warn('[Server] GET /api/chats/:chatId/messages — missing chatId.');
      return res.status(400).json({ error: 'Invalid chat ID.' });
    }

    const ownershipCheck = await query(
      'SELECT id FROM chats WHERE id = $1 AND user_id = $2',
      [chatId, userId]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Chat not found.' });
    }

    const result = await query(
      'SELECT id, chat_id, role, text, created_at FROM messages WHERE chat_id = $1 ORDER BY created_at ASC',
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

    const server = app.listen(PORT, () => {
      console.log(`[Server] Backend listening on http://localhost:${PORT}`);
      if (isConnected) {
        console.log('[Server] Database: celume_ai_workspace — connected ✓');
      } else {
        console.log('[Server] Database: not connected — running in demo mode.');
      }
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`[Server] Port ${PORT} is already in use.`);
        console.error('[Server] Another backend process is likely already running on this port.');
        console.error('[Server] Reuse the existing server, or stop the current process before starting a new one.');
        process.exitCode = 0;
        return;
      }

      console.error('[Server] Failed to start:', error.message);
      process.exitCode = 1;
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
