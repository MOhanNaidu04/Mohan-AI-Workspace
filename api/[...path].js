import bcrypt from 'bcrypt';
import { query } from '../db/db.js';
import { generateToken, verifyToken } from '../db/auth.js';

const replies = {
  marketing: 'Use customer outcomes, clear value, and a strong CTA for marketing copy.',
  sales: 'Keep it concise, benefits-led, and reference the customer pain point quickly.',
  hr: 'Build structure around role, culture, and evaluation criteria for HR content.',
  coding: 'Explain the issue clearly, propose steps, and reference the code context.',
  business: 'Focus on impact, growth metrics, and a measurable next action.',
};

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function methodNotAllowed(res, allowedMethods) {
  res.setHeader('Allow', allowedMethods.join(', '));
  sendJson(res, 405, {
    error: `Method ${res.req?.method || 'UNKNOWN'} is not allowed on this route.`,
  });
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  if (typeof req.body === 'string' && req.body.trim()) {
    return JSON.parse(req.body);
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function getToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) return null;
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
}

function requireUser(req) {
  const token = getToken(req);
  if (!token) return null;
  return verifyToken(token);
}

function normalizeUserRow(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.full_name,
    theme: user.theme,
    accentColor: user.accent_color,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname.replace(/^\/api/, '') || '/';

  try {
    if (pathname === '/' && req.method === 'GET') {
      sendJson(res, 200, { status: 'ok', environment: 'vercel' });
      return;
    }

    if (pathname === '/status' && req.method === 'GET') {
      sendJson(res, 200, { status: 'ok', environment: 'vercel' });
      return;
    }

    if (pathname === '/db/status' && req.method === 'GET') {
      const result = await query('SELECT NOW()');
      sendJson(res, 200, {
        status: 'connected',
        timestamp: result.rows[0].now,
      });
      return;
    }

    if (pathname === '/auth/register' && req.method === 'POST') {
      const body = await readBody(req);
      const { username, email, password, fullName } = body;

      if (!username || !email || !password) {
        sendJson(res, 400, { error: 'Username, email, and password are required' });
        return;
      }

      const existingUser = await query(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [email, username]
      );

      if (existingUser.rows.length > 0) {
        sendJson(res, 409, { error: 'User already exists with this email or username' });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await query(
        `INSERT INTO users (username, email, password_hash, full_name, created_at, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id, username, email, full_name, created_at`,
        [username, email, hashedPassword, fullName || username]
      );

      const user = result.rows[0];
      const token = generateToken(user.id, user.email);

      sendJson(res, 201, {
        message: 'User registered successfully',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          createdAt: user.created_at,
        },
        token,
      });
      return;
    }

    if (pathname === '/auth/login' && req.method === 'POST') {
      const body = await readBody(req);
      const { email, password } = body;

      if (!email || !password) {
        sendJson(res, 400, { error: 'Email and password are required' });
        return;
      }

      const result = await query(
        'SELECT id, username, email, full_name, password_hash, created_at FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        sendJson(res, 401, { error: 'Invalid email or password' });
        return;
      }

      const user = result.rows[0];
      const passwordMatch = await bcrypt.compare(password, user.password_hash);

      if (!passwordMatch) {
        sendJson(res, 401, { error: 'Invalid email or password' });
        return;
      }

      const token = generateToken(user.id, user.email);
      sendJson(res, 200, {
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          createdAt: user.created_at,
        },
        token,
      });
      return;
    }

    if (pathname === '/auth/me' && req.method === 'GET') {
      const decoded = requireUser(req);
      if (!decoded) {
        sendJson(res, 401, { error: 'No authorization header' });
        return;
      }

      const result = await query(
        'SELECT id, username, email, full_name, theme, accent_color, created_at, updated_at FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        sendJson(res, 404, { error: 'User not found' });
        return;
      }

      sendJson(res, 200, { user: normalizeUserRow(result.rows[0]) });
      return;
    }

    if (pathname === '/auth/profile' && req.method === 'PUT') {
      const decoded = requireUser(req);
      if (!decoded) {
        sendJson(res, 401, { error: 'No authorization header' });
        return;
      }

      const body = await readBody(req);
      const { fullName, email, theme, accentColor } = body;

      if (email) {
        const existingUser = await query(
          'SELECT id FROM users WHERE email = $1 AND id <> $2',
          [email, decoded.userId]
        );

        if (existingUser.rows.length > 0) {
          sendJson(res, 409, { error: 'Email is already in use' });
          return;
        }
      }

      const result = await query(
        `UPDATE users
         SET full_name = COALESCE($2, full_name),
             email = COALESCE($3, email),
             theme = COALESCE($4, theme),
             accent_color = COALESCE($5, accent_color),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING id, username, email, full_name, theme, accent_color, updated_at`,
        [decoded.userId, fullName, email, theme, accentColor]
      );

      if (result.rows.length === 0) {
        sendJson(res, 404, { error: 'User not found' });
        return;
      }

      sendJson(res, 200, {
        message: 'User updated successfully',
        user: normalizeUserRow(result.rows[0]),
      });
      return;
    }

    if (pathname === '/categories' && req.method === 'GET') {
      const result = await query('SELECT * FROM categories ORDER BY id');
      sendJson(res, 200, result.rows);
      return;
    }

    if (pathname === '/prompts' && req.method === 'GET') {
      const result = await query('SELECT * FROM prompt_templates ORDER BY created_at DESC');
      sendJson(res, 200, result.rows);
      return;
    }

    if (pathname === '/projects' && req.method === 'GET') {
      const decoded = requireUser(req);
      if (!decoded) {
        sendJson(res, 401, { error: 'No authorization header' });
        return;
      }

      const result = await query('SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC', [decoded.userId]);
      sendJson(res, 200, result.rows);
      return;
    }

    if (pathname === '/tasks' && req.method === 'GET') {
      const decoded = requireUser(req);
      if (!decoded) {
        sendJson(res, 401, { error: 'No authorization header' });
        return;
      }

      const result = await query('SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC', [decoded.userId]);
      sendJson(res, 200, result.rows);
      return;
    }

    if (pathname === '/chats' && req.method === 'GET') {
      const decoded = requireUser(req);
      if (!decoded) {
        sendJson(res, 401, { error: 'No authorization header' });
        return;
      }

      const result = await query(
        `SELECT c.*, ct.label as category_label
         FROM chats c
         LEFT JOIN categories ct ON c.category_id = ct.id
         WHERE c.user_id = $1
         ORDER BY c.updated_at DESC`,
        [decoded.userId]
      );
      sendJson(res, 200, result.rows);
      return;
    }

    if (pathname.match(/^\/chats\/[^/]+\/messages$/) && req.method === 'GET') {
      const decoded = requireUser(req);
      if (!decoded) {
        sendJson(res, 401, { error: 'No authorization header' });
        return;
      }

      const chatId = pathname.split('/')[2];
      const result = await query('SELECT * FROM messages WHERE chat_id = $1 ORDER BY created_at ASC', [chatId]);
      sendJson(res, 200, result.rows);
      return;
    }

    if (pathname === '/chat' && req.method === 'POST') {
      const decoded = requireUser(req);
      if (!decoded) {
        sendJson(res, 401, { error: 'No authorization header' });
        return;
      }

      const body = await readBody(req);
      const { prompt, category } = body;

      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        sendJson(res, 400, { error: 'prompt is required and must be a non-empty string.' });
        return;
      }

      if (!category || typeof category !== 'string') {
        sendJson(res, 400, { error: 'category is required and must be a string.' });
        return;
      }

      if (!replies[category]) {
        sendJson(res, 400, {
          error: `Unknown category "${category}". Valid categories: ${Object.keys(replies).join(', ')}.`,
        });
        return;
      }

      const response = {
        answer: `${replies[category]} Here is a clean response for your prompt: ${prompt}`,
        category,
        createdAt: new Date().toISOString(),
      };

      const chatResult = await query(
        `INSERT INTO chats (user_id, title, category_id, last_message, created_at, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id, title, created_at;`,
        [decoded.userId, prompt.trim().substring(0, 100), category, response.answer]
      );

      response.chatId = chatResult.rows[0].id;
      sendJson(res, 200, response);
      return;
    }

    sendJson(res, 404, { error: `Route ${req.method} ${pathname} not found.` });
  } catch (error) {
    console.error('[Vercel API] Error handling request:', error);
    sendJson(res, 500, { error: 'An unexpected server error occurred. Please try again later.' });
  }
}

