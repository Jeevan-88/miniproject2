import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('social.db');
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'ROLE_USER',
    verification_status TEXT DEFAULT 'PENDING',
    verification_token TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_info (
    user_id INTEGER PRIMARY KEY,
    full_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS likes (
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    PRIMARY KEY (post_id, user_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

async function startServer() {
  const app = express();
  app.use(express.json());

  // --- Middleware ---
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: 'Forbidden' });
      req.user = user;
      next();
    });
  };

  const checkVerified = (req: any, res: any, next: any) => {
    const user = db.prepare('SELECT verification_status FROM users WHERE id = ?').get(req.user.id) as any;
    if (user?.verification_status !== 'VERIFIED') {
      return res.status(403).json({ error: 'Email verification required' });
    }
    next();
  };

  // --- Auth Routes ---
  app.post('/api/auth/register', async (req, res) => {
    const { email, password, fullName } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const verificationToken = Math.random().toString(36).substring(2, 15);
      
      const result = db.prepare('INSERT INTO users (email, password, verification_token) VALUES (?, ?, ?)').run(email, hashedPassword, verificationToken);
      const userId = result.lastInsertRowid;
      
      db.prepare('INSERT INTO user_info (user_id, full_name) VALUES (?, ?)').run(userId, fullName || '');

      // Mock Email Sending
      console.log(`[EMAIL MOCK] Verification link for ${email}: http://localhost:3000/api/auth/verify?token=${verificationToken}`);

      res.status(201).json({ message: 'User registered. Please verify your email.', userId });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/auth/verify', (req, res) => {
    const { token } = req.query;
    const user = db.prepare('SELECT id FROM users WHERE verification_token = ?').get(token) as any;
    
    if (!user) return res.status(400).json({ error: 'Invalid token' });

    db.prepare('UPDATE users SET verification_status = "VERIFIED", verification_token = NULL WHERE id = ?').run(user.id);
    res.send('<h1>Email Verified Successfully!</h1><p>You can now log in.</p>');
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.verification_status !== 'VERIFIED') {
      return res.status(403).json({ error: 'Please verify your email first' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  });

  // --- Post Routes ---
  app.get('/api/posts', (req, res) => {
    const page = parseInt(req.query.page as string) || 0;
    const size = parseInt(req.query.size as string) || 10;
    const offset = page * size;
    const sort = req.query.sort === 'asc' ? 'ASC' : 'DESC';

    const posts = db.prepare(`
      SELECT p.*, u.email, ui.full_name, 
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      JOIN user_info ui ON u.id = ui.user_id
      ORDER BY p.created_at ${sort}
      LIMIT ? OFFSET ?
    `).all(size, offset);

    res.json(posts);
  });

  app.post('/api/posts', authenticateToken, checkVerified, (req: any, res) => {
    const { content } = req.body;
    const result = db.prepare('INSERT INTO posts (user_id, content) VALUES (?, ?)').run(req.user.id, content);
    
    // External API Integration Mock (Analytics)
    console.log(`[EXTERNAL API] Notifying analytics service about new post: ${result.lastInsertRowid}`);
    
    res.status(201).json({ id: result.lastInsertRowid, content });
  });

  app.delete('/api/posts/:id', authenticateToken, (req: any, res) => {
    const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(req.params.id) as any;
    if (!post) return res.status(404).json({ error: 'Post not found' });

    if (post.user_id !== req.user.id && req.user.role !== 'ROLE_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
    res.json({ message: 'Post deleted' });
  });

  // --- Like Routes ---
  app.post('/api/posts/:id/like', authenticateToken, checkVerified, (req: any, res) => {
    try {
      db.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)').run(req.params.id, req.user.id);
      res.json({ message: 'Post liked' });
    } catch (error) {
      res.status(400).json({ error: 'Already liked or post missing' });
    }
  });

  // --- Comment Routes ---
  app.post('/api/posts/:id/comments', authenticateToken, checkVerified, (req: any, res) => {
    const { content } = req.body;
    const result = db.prepare('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)').run(req.params.id, req.user.id, content);
    res.status(201).json({ id: result.lastInsertRowid, content });
  });

  app.get('/api/posts/:id/comments', (req, res) => {
    const comments = db.prepare(`
      SELECT c.*, ui.full_name 
      FROM comments c
      JOIN user_info ui ON c.user_id = ui.user_id
      WHERE c.post_id = ?
      ORDER BY c.created_at DESC
    `).all(req.params.id);
    res.json(comments);
  });

  // --- Vite Integration ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
