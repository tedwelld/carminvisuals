const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const bcrypt = require('bcrypt');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'database.sqlite');
const db = new sqlite3.Database(DB_PATH);

db.serialize(async () => {
  // Create users table with extended fields if it doesn't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      age INTEGER,
      email TEXT UNIQUE,
      phone TEXT,
      is_superuser INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 0,
      created_at TEXT
    )
  `);

  // Create posts table for news
  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      summary TEXT,
      body TEXT,
      created_at TEXT
    )
  `);

  // Seed default posts if none exist
  db.get('SELECT COUNT(1) as cnt FROM posts', async (err, row) => {
    if (err) console.error('DB posts check error', err);
    else if (row && row.cnt === 0) {
      const now = new Date().toISOString();
      const posts = [
        { title: 'Welcome to Carmine Visuals', summary: 'Introducing our new media and IT services.', body: 'We are excited to launch Carmine Visuals — offering video production, photography, web development and IT consulting.' },
        { title: 'New Portfolio Coming Soon', summary: 'We are preparing a showcase of our best work.', body: 'Stay tuned for an updated gallery featuring corporate videos and product photography.' }
      ];
      const stmt = db.prepare('INSERT INTO posts (title, summary, body, created_at) VALUES (?,?,?,datetime("now"))');
      posts.forEach(p => stmt.run(p.title, p.summary, p.body));
      stmt.finalize();
      console.log('Seeded default posts.');
    }
  });

  // Check if any user exists; if none, seed a superuser and mark active
  db.get('SELECT COUNT(1) as cnt FROM users', async (err, row) => {
    if (err) return console.error('DB check error', err);
    if (row && row.cnt > 0) {
      console.log('Users already exist — skipping user seed.');
      db.close();
      return;
    }

    // Seed a superuser
    const username = process.env.SEED_ADMIN_USER || 'admin';
    const password = process.env.SEED_ADMIN_PASS || 'Admin@123';
    const hash = await bcrypt.hash(password, 10);
    db.run('INSERT INTO users (username, password_hash, is_superuser, is_active, created_at) VALUES (?,?,1,1,datetime("now"))', [username, hash], function(err) {
      if (err) return console.error('Error seeding admin', err);
      console.log(`Seeded admin user: ${username} (password: ${password})`);
      console.log('Please change the password immediately after first login.');
      db.close();
    });
  });
});
