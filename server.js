const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// Load environment variables from .env file
require('dotenv').config();

const DB_TYPE = process.env.DB_TYPE || 'sqlite';
let db;

// Initialize database based on DB_TYPE
try {
  if (DB_TYPE === 'mssql') {
    const sql = require('mssql');
    const connStr = process.env.SQLSERVER_CONN;
    if (!connStr) {
      console.error('❌ DB_TYPE is set to "mssql" but SQLSERVER_CONN env var is not set.');
      process.exit(1);
    }
    // MSSQL pool will be initialized on first use (async)
    console.log('📡 Using SQL Server (connection will be made on first query)');
  } else {
    // SQLite (default)
    const DB_PATH = path.join(__dirname, 'data', 'database.sqlite');
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('❌ Failed to open SQLite database:', err);
        process.exit(1);
      }
      console.log('✅ SQLite database initialized at', DB_PATH);
    });
  }
} catch (err) {
  console.error('❌ Database initialization error:', err);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// Middleware to expose user to views
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

function requireSuperuser(req, res, next) {
  if (!req.session.user || !req.session.user.is_superuser) return res.status(403).send('Forbidden: superuser only');
  next();
}

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/services', (req, res) => {
  res.render('services');
});

app.get('/gallery', (req, res) => {
  res.render('gallery');
});

app.get('/contact', (req, res) => {
  res.render('contact', { success: false, error: null });
});

app.post('/contact', (req, res) => {
  const { name, email, service, message } = req.body;
  if (!name || !email || !message) {
    return res.render('contact', { success: false, error: '❌ Name, email, and message are required' });
  }
  // For now, just log the contact submission (could integrate email service)
  console.log(`📧 Contact submission: ${name} (${email}) - Service: ${service} - Message: ${message.substring(0, 50)}...`);
  res.render('contact', { success: true, error: null });
});

app.get('/register', (req, res) => res.render('register', { error: null, message: null }));
app.post('/register', async (req, res) => {
  const { username, password, first_name, last_name, age, email, phone } = req.body;
  if (!username || !password || !email || !first_name || !last_name) return res.render('register', { error: '❌ Missing required fields', message: null });
  db.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email], async (err, row) => {
    if (err) return res.render('register', { error: '❌ Database error', message: null });
    if (row) return res.render('register', { error: '❌ Username or email already in use', message: null });
    const hash = await bcrypt.hash(password, 10);
    db.run('INSERT INTO users (username, password_hash, first_name, last_name, age, email, phone, is_superuser, is_active, created_at) VALUES (?,?,?,?,?,?,?,?,?,datetime("now"))', [username, hash, first_name, last_name, age || null, email, phone || null, 0, 0], function(err) {
      if (err) return res.render('register', { error: '❌ Error creating account', message: null });
      const userId = this.lastID;
      // Generate activation token
      const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'dev-jwt-secret-change';
      const token = jwt.sign({ id: userId, email }, jwtSecret, { expiresIn: '1d' });
      const activateUrl = `${req.protocol}://${req.get('host')}/activate?token=${token}`;

      // Send activation email if SMTP configured, otherwise log activation URL
      if (process.env.SMTP_HOST) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_SECURE === 'true',
          auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
        });
        const mail = {
          from: process.env.SMTP_FROM || 'no-reply@carminevisuals.local',
          to: email,
          subject: 'Activate your Carmine Visuals account',
          text: `Hello ${first_name},\n\nPlease activate your account by visiting: ${activateUrl}\n\nIf you did not register, ignore this email.\n`,
          html: `<p>Hello ${first_name},</p><p>Please activate your account by clicking <a href="${activateUrl}">Activate account</a>.</p>`
        };
        transporter.sendMail(mail).then(() => console.log('Activation email sent to', email)).catch(err => console.error('Email send error', err));
      } else {
        console.log('Activation (no SMTP configured). Activation URL for user:', email, activateUrl);
      }

      res.render('register', { error: null, message: '✅ Registration complete. Check your email for an activation link.' });
    });
  });
});

app.get('/login', (req, res) => res.render('login', { error: null, message: null }));
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.render('login', { error: '❌ Missing username or password', message: null });
  db.get('SELECT id, username, password_hash, is_superuser, is_active FROM users WHERE username = ?', [username], async (err, row) => {
    if (err) return res.render('login', { error: '❌ Database error', message: null });
    if (!row) return res.render('login', { error: '❌ Invalid credentials', message: null });
    if (!row.is_active) return res.render('login', { error: '❌ Account not activated. Check your email for activation link.', message: null });
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return res.render('login', { error: '❌ Invalid credentials', message: null });
    req.session.user = { id: row.id, username: row.username, is_superuser: row.is_superuser };
    res.redirect('/dashboard');
  });
});

// Activation route
app.get('/activate', (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(400).send('Invalid activation request');
  const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'dev-jwt-secret-change';
  try {
    const payload = jwt.verify(token, jwtSecret);
    const uid = payload.id;
    db.run('UPDATE users SET is_active = 1 WHERE id = ?', [uid], function(err) {
      if (err) return res.status(500).send('Activation failed');
      // render login with success message
      res.render('login', { error: null, message: '✅ Account activated. You may now log in.' });
    });
  } catch (e) {
    return res.status(400).send('Activation link invalid or expired');
  }
});

// News routes
app.get('/news', (req, res) => {
  db.all('SELECT id, title, summary, created_at FROM posts ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).send('❌ Database error');
    res.render('news', { posts: rows });
  });
});

app.get('/news/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT id, title, body, created_at FROM posts WHERE id = ?', [id], (err, row) => {
    if (err || !row) return res.status(404).send('Post not found');
    res.render('news_item', { post: row });
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

app.get('/dashboard', requireAuth, (req, res) => {
  res.render('dashboard');
});

app.get('/admin', requireAuth, requireSuperuser, (req, res) => {
  db.all('SELECT id, username, is_superuser, created_at FROM users ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).send('❌ Database error');
    res.render('admin', { users: rows });
  });
});

// Simple API to toggle superuser (admin only)
app.post('/admin/toggle-super/:id', requireAuth, requireSuperuser, (req, res) => {
  const uid = req.params.id;
  db.get('SELECT is_superuser FROM users WHERE id = ?', [uid], (err, row) => {
    if (err || !row) return res.status(400).send('❌ User not found');
    const newVal = row.is_superuser ? 0 : 1;
    db.run('UPDATE users SET is_superuser = ? WHERE id = ?', [newVal, uid], function(err) {
      if (err) return res.status(500).send('❌ Database error');
      res.redirect('/admin');
    });
  });
});

app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
