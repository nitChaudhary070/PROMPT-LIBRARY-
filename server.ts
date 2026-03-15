import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Setup uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

// Database setup
const db = new Database('database.sqlite');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    prompt_text TEXT,
    image_url TEXT,
    category TEXT,
    tags TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS favorites (
    user_id INTEGER,
    prompt_id INTEGER,
    PRIMARY KEY (user_id, prompt_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (prompt_id) REFERENCES prompts(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Seed default settings
try {
  db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run('show_ads', '1');
} catch (e) {}

// Add views and copies columns to prompts if they don't exist
try {
  db.prepare('ALTER TABLE prompts ADD COLUMN views INTEGER DEFAULT 0').run();
} catch (e) {
  // Column might already exist, ignore
}
try {
  db.prepare('ALTER TABLE prompts ADD COLUMN copies INTEGER DEFAULT 0').run();
} catch (e) {
  // Column might already exist, ignore
}

// Seed admin user if not exists
const adminEmail = 'admin@example.com';
const adminPassword = 'admin'; // In a real app, use a strong password
const existingAdmin = db.prepare('SELECT * FROM users WHERE email = ?').get(adminEmail);
if (!existingAdmin) {
  const hashedPassword = bcrypt.hashSync(adminPassword, 10);
  db.prepare('INSERT INTO users (email, password, role) VALUES (?, ?, ?)').run(adminEmail, hashedPassword, 'admin');
}

// Seed prompts if empty
const promptsCount = db.prepare('SELECT COUNT(*) as count FROM prompts').get() as any;
if (promptsCount.count === 0) {
  const seedPrompts = [
    {
      title: 'Cyberpunk Neon City',
      prompt_text: 'A futuristic cyberpunk city at night, raining, neon lights reflecting on wet pavement, flying cars, highly detailed, 8k resolution, cinematic lighting, unreal engine 5 render',
      image_url: 'https://picsum.photos/seed/cyberpunk/800/1200',
      category: 'Cinematic Prompts',
      tags: 'cyberpunk, neon, city, night, rain'
    },
    {
      title: 'Cute Anime Girl',
      prompt_text: 'A cute anime girl with pink hair, wearing a school uniform, cherry blossoms in the background, soft pastel colors, Studio Ghibli style, highly detailed',
      image_url: 'https://picsum.photos/seed/anime/800/800',
      category: 'Anime Prompts',
      tags: 'anime, girl, pink hair, school uniform, cherry blossoms'
    },
    {
      title: 'Minimalist Tech Logo',
      prompt_text: 'A minimalist logo for a tech startup, featuring a stylized letter M, geometric shapes, gradient blue and purple colors, clean white background, vector art',
      image_url: 'https://picsum.photos/seed/logo/800/600',
      category: 'Business Logo Prompts',
      tags: 'logo, tech, minimalist, geometric, gradient'
    },
    {
      title: 'Epic Fantasy Landscape',
      prompt_text: 'An epic fantasy landscape, towering mountains, a glowing magical castle on a cliff, dragons flying in the sky, dramatic clouds, golden hour lighting, masterpiece',
      image_url: 'https://picsum.photos/seed/fantasy/1200/800',
      category: 'Fantasy Prompts',
      tags: 'fantasy, landscape, castle, dragons, mountains'
    },
    {
      title: 'Realistic Portrait of an Old Man',
      prompt_text: 'A hyper-realistic portrait of an old man with deep wrinkles, piercing blue eyes, wearing a tweed jacket, dramatic studio lighting, 85mm lens, f/1.8, highly detailed texture',
      image_url: 'https://picsum.photos/seed/portrait/800/1000',
      category: 'Realistic Portrait Prompts',
      tags: 'portrait, realistic, old man, detailed, photography'
    }
  ];

  const insertPrompt = db.prepare('INSERT INTO prompts (title, prompt_text, image_url, category, tags) VALUES (?, ?, ?, ?, ?)');
  seedPrompts.forEach(p => {
    insertPrompt.run(p.title, p.prompt_text, p.image_url, p.category, p.tags);
  });
}

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
});
const upload = multer({ storage: storage });

// Auth Middleware
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';

const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  next();
};

// API Routes

// Auth
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

  if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { email, password } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (email, password) VALUES (?, ?)').run(email, hashedPassword);
    const token = jwt.sign({ id: result.lastInsertRowid, email, role: 'user' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: result.lastInsertRowid, email, role: 'user' } });
  } catch (error) {
    res.status(400).json({ error: 'Email already exists' });
  }
});

// Settings
app.get('/api/settings', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM settings').all() as any[];
    const settingsObj = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settingsObj);
  } catch (error) {
    res.json({ show_ads: '1' }); // Fallback
  }
});

app.post('/api/admin/settings', authenticateToken, requireAdmin, (req, res) => {
  const { show_ads } = req.body;
  try {
    db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(show_ads ? '1' : '0', 'show_ads');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Prompts
app.get('/api/prompts', (req, res) => {
  const { category, search, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  
  let query = 'SELECT * FROM prompts WHERE 1=1';
  const params: any[] = [];

  if (category && category !== 'All') {
    query += ' AND category = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND (title LIKE ? OR prompt_text LIKE ? OR tags LIKE ?)';
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  query += ' ORDER BY created_date DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), offset);

  const prompts = db.prepare(query).all(...params);
  
  // Get total count for pagination
  let countQuery = 'SELECT COUNT(*) as count FROM prompts WHERE 1=1';
  const countParams: any[] = [];
  if (category && category !== 'All') {
    countQuery += ' AND category = ?';
    countParams.push(category);
  }
  if (search) {
    countQuery += ' AND (title LIKE ? OR prompt_text LIKE ? OR tags LIKE ?)';
    const searchParam = `%${search}%`;
    countParams.push(searchParam, searchParam, searchParam);
  }
  const totalCount = (db.prepare(countQuery).get(...countParams) as any).count;

  res.json({ prompts, totalPages: Math.ceil(totalCount / Number(limit)) });
});

app.get('/api/prompts/:id', (req, res) => {
  const prompt = db.prepare('SELECT * FROM prompts WHERE id = ?').get(req.params.id);
  if (prompt) {
    res.json(prompt);
  } else {
    res.status(404).json({ error: 'Prompt not found' });
  }
});

app.get('/api/prompts/:id/similar', (req, res) => {
  const prompt = db.prepare('SELECT * FROM prompts WHERE id = ?').get(req.params.id) as any;
  if (!prompt) return res.status(404).json({ error: 'Prompt not found' });

  const similar = db.prepare('SELECT * FROM prompts WHERE category = ? AND id != ? LIMIT 4').all(prompt.category, prompt.id);
  res.json(similar);
});

// Analytics Tracking
app.post('/api/prompts/:id/view', (req, res) => {
  try {
    db.prepare('UPDATE prompts SET views = COALESCE(views, 0) + 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update views' });
  }
});

app.post('/api/prompts/:id/copy', (req, res) => {
  try {
    db.prepare('UPDATE prompts SET copies = COALESCE(copies, 0) + 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update copies' });
  }
});

// Admin Stats
app.get('/api/admin/stats', authenticateToken, requireAdmin, (req, res) => {
  try {
    const usersCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
    const promptsCount = (db.prepare('SELECT COUNT(*) as count FROM prompts').get() as any).count;
    const totalViews = (db.prepare('SELECT SUM(views) as total FROM prompts').get() as any).total || 0;
    const totalCopies = (db.prepare('SELECT SUM(copies) as total FROM prompts').get() as any).total || 0;
    
    const topPrompts = db.prepare('SELECT id, title, views, copies, category FROM prompts ORDER BY views DESC LIMIT 5').all();

    res.json({
      users: usersCount,
      prompts: promptsCount,
      views: totalViews,
      copies: totalCopies,
      topPrompts
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Admin Upload
app.post('/api/prompts', authenticateToken, requireAdmin, upload.single('image'), (req, res) => {
  const { title, prompt_text, category, tags, image_url } = req.body;
  let finalImageUrl = image_url;

  if (req.file) {
    finalImageUrl = `/uploads/${req.file.filename}`;
  }

  if (!finalImageUrl) {
    return res.status(400).json({ error: 'Image is required' });
  }

  const result = db.prepare(
    'INSERT INTO prompts (title, prompt_text, image_url, category, tags) VALUES (?, ?, ?, ?, ?)'
  ).run(title, prompt_text, finalImageUrl, category, tags);

  res.json({ id: result.lastInsertRowid, title, prompt_text, image_url: finalImageUrl, category, tags });
});

// Favorites
app.get('/api/favorites', authenticateToken, (req: any, res) => {
  const prompts = db.prepare(`
    SELECT p.* FROM prompts p
    JOIN favorites f ON p.id = f.prompt_id
    WHERE f.user_id = ?
    ORDER BY p.created_date DESC
  `).all(req.user.id);
  res.json(prompts);
});

app.post('/api/favorites/:promptId', authenticateToken, (req: any, res) => {
  try {
    db.prepare('INSERT INTO favorites (user_id, prompt_id) VALUES (?, ?)').run(req.user.id, req.params.promptId);
    res.json({ success: true });
  } catch (error) {
    // Might already be favorited
    res.json({ success: true });
  }
});

app.delete('/api/favorites/:promptId', authenticateToken, (req: any, res) => {
  db.prepare('DELETE FROM favorites WHERE user_id = ? AND prompt_id = ?').run(req.user.id, req.params.promptId);
  res.json({ success: true });
});

app.get('/api/favorites/check/:promptId', authenticateToken, (req: any, res) => {
  const favorite = db.prepare('SELECT 1 FROM favorites WHERE user_id = ? AND prompt_id = ?').get(req.user.id, req.params.promptId);
  res.json({ isFavorite: !!favorite });
});

// Categories
app.get('/api/categories', (req, res) => {
  const defaultCategories = [
    'Boys AI Prompts',
    'Girls AI Prompts',
    'Couple AI Prompts',
    'Logo Design Prompts',
    'Anime Prompts',
    'Fantasy Prompts',
    'Cinematic Prompts',
    'Realistic Portrait Prompts',
    'Business Logo Prompts'
  ];
  
  try {
    const dbCategories = db.prepare('SELECT DISTINCT category FROM prompts WHERE category IS NOT NULL AND category != ""').all() as any[];
    const allCategories = new Set([...defaultCategories, ...dbCategories.map(c => c.category)]);
    res.json(Array.from(allCategories));
  } catch (error) {
    res.json(defaultCategories);
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
