/*
Node migration script to create users and posts tables in SQL Server and optionally
migrate data from the local SQLite database located at `data/database.sqlite`.

Usage:
  - Set connection string in env var `SQLSERVER_CONN` and run:
      node db/migrate_sqlserver.js
  - Or pass connection string as first argument:
      node db/migrate_sqlserver.js "Data Source=..."

Notes:
  - This script will create tables if they don't already exist.
  - If a local SQLite DB exists, it will attempt to migrate `users` and `posts` rows.
  - Run this locally where you have network access to the SQL Server instance.
*/

const sql = require('mssql');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const connStr = process.argv[2] || process.env.SQLSERVER_CONN;
if (!connStr) {
  console.error('\nERROR: No SQL Server connection string provided.');
  console.error('Provide it as first argument or set SQLSERVER_CONN env var.');
  console.error('\nExample:');
  console.error("node db/migrate_sqlserver.js \"Data Source=SERVER\\\\SQLEXPRESS;Integrated Security=True;...\"");
  process.exit(1);
}

async function runMigrations() {
  console.log('Connecting to SQL Server...');
  let pool;
  try {
    pool = await sql.connect(connStr);
    console.log('✅ Connected to SQL Server');
  } catch (err) {
    console.error('❌ Failed to connect to SQL Server:', err.message || err);
    console.error('Common issues:');
    console.error('  - SQL Server is not running or not accessible at the hostname/IP');
    console.error('  - Network/firewall is blocking the connection');
    console.error('  - Wrong authentication (Integrated Security requires Windows domain user)');
    console.error('  - Connection string format is incorrect');
    process.exit(1);
  }

  // Create users table
  const createUsers = `
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[users]') AND type = N'U')
BEGIN
  CREATE TABLE [dbo].[users] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [username] NVARCHAR(150) NOT NULL UNIQUE,
    [password_hash] NVARCHAR(255) NOT NULL,
    [first_name] NVARCHAR(100) NULL,
    [last_name] NVARCHAR(100) NULL,
    [age] INT NULL,
    [email] NVARCHAR(255) NULL UNIQUE,
    [phone] NVARCHAR(50) NULL,
    [is_superuser] BIT DEFAULT 0,
    [is_active] BIT DEFAULT 0,
    [created_at] DATETIME2 DEFAULT SYSUTCDATETIME()
  );
END
`;

  const createPosts = `
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[posts]') AND type = N'U')
BEGIN
  CREATE TABLE [dbo].[posts] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [title] NVARCHAR(255) NOT NULL,
    [summary] NVARCHAR(1000) NULL,
    [body] NVARCHAR(MAX) NULL,
    [created_at] DATETIME2 DEFAULT SYSUTCDATETIME()
  );
END
`;

  try {
    console.log('Creating `users` table if missing...');
    await pool.request().query(createUsers);
    console.log('Creating `posts` table if missing...');
    await pool.request().query(createPosts);
    console.log('Tables ensured.');
  } catch (err) {
    console.error('Error running create table scripts:', err.message || err);
    await sql.close();
    process.exit(1);
  }

  // Optional migration from local SQLite
  const sqlitePath = path.join(__dirname, '..', 'data', 'database.sqlite');
  if (!fs.existsSync(sqlitePath)) {
    console.log('No local SQLite DB found at', sqlitePath, '- skipping data migration.');
    await sql.close();
    console.log('Migration finished.');
    return;
  }

  console.log('Local SQLite DB found. Migrating data from', sqlitePath);
  const sdb = new sqlite3.Database(sqlitePath, sqlite3.OPEN_READONLY, (err) => {
    if (err) console.error('Could not open sqlite db:', err);
  });

  try {
    // Migrate users
    const users = await new Promise((resolve, reject) => {
      sdb.all('SELECT id, username, password_hash, first_name, last_name, age, email, phone, is_superuser, is_active, created_at FROM users', [], (err, rows) => {
        if (err) return resolve([]); // if table missing, return empty
        resolve(rows || []);
      });
    });

    if (users.length > 0) {
      console.log('Migrating', users.length, 'users');
      for (const u of users) {
        try {
          await pool.request()
            .input('username', sql.NVarChar(150), u.username)
            .input('password_hash', sql.NVarChar(255), u.password_hash)
            .input('first_name', sql.NVarChar(100), u.first_name)
            .input('last_name', sql.NVarChar(100), u.last_name)
            .input('age', sql.Int, u.age)
            .input('email', sql.NVarChar(255), u.email)
            .input('phone', sql.NVarChar(50), u.phone)
            .input('is_superuser', sql.Bit, u.is_superuser ? 1 : 0)
            .input('is_active', sql.Bit, u.is_active ? 1 : 0)
            .input('created_at', sql.DateTime2, u.created_at ? new Date(u.created_at) : new Date())
            .query(`
IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE username = @username OR (email IS NOT NULL AND email = @email))
BEGIN
  INSERT INTO dbo.users (username, password_hash, first_name, last_name, age, email, phone, is_superuser, is_active, created_at)
  VALUES (@username, @password_hash, @first_name, @last_name, @age, @email, @phone, @is_superuser, @is_active, @created_at)
END
`);
        } catch (err) {
          console.warn('Skipped user', u.username, '-', err.message || err);
        }
      }
    } else {
      console.log('No users found in SQLite — skipping users migration.');
    }

    // Migrate posts
    const posts = await new Promise((resolve, reject) => {
      sdb.all('SELECT id, title, summary, body, created_at FROM posts', [], (err, rows) => {
        if (err) return resolve([]);
        resolve(rows || []);
      });
    });

    if (posts.length > 0) {
      console.log('Migrating', posts.length, 'posts');
      for (const p of posts) {
        try {
          await pool.request()
            .input('title', sql.NVarChar(255), p.title)
            .input('summary', sql.NVarChar(1000), p.summary)
            .input('body', sql.NVarChar(sql.MAX), p.body)
            .input('created_at', sql.DateTime2, p.created_at ? new Date(p.created_at) : new Date())
            .query(`
IF NOT EXISTS (SELECT 1 FROM dbo.posts WHERE title = @title AND created_at = @created_at)
BEGIN
  INSERT INTO dbo.posts (title, summary, body, created_at)
  VALUES (@title, @summary, @body, @created_at)
END
`);
        } catch (err) {
          console.warn('Skipped post', p.title, '-', err.message || err);
        }
      }
    } else {
      console.log('No posts found in SQLite — skipping posts migration.');
    }

    sdb.close();
    console.log('Data migration complete.');
  } catch (err) {
    console.error('Error during migration:', err.message || err);
  } finally {
    await sql.close();
    console.log('Disconnected from SQL Server.');
  }
}

runMigrations().catch(err => {
  console.error('Migration failed:', err.message || err);
  process.exit(1);
});
