# Carmine Visuals — Demo Website

This repository contains a minimal Express + SQLite website for Carmine Visuals with authentication and an admin console.

Features
- User registration and login
# Carmine Visuals — Demo Website

This repository contains a minimal Express + SQLite website for Carmine Visuals with authentication, activation flow, and an admin console.

Features
- User registration with extended profile fields (first/last name, age, email, phone)
- Email activation using JWT tokens (activation link emailed or logged)
- Session-based auth
- Admin console (promote/revoke superuser)
- Simple news/posts table and listing at `/news`

Quick start (Windows PowerShell)

1. Install dependencies

```powershell
cd C:\Users\tedwell_d\source\repos\CarmineVisuals
npm install
```

2. Initialize the database (seeds an admin: `admin` / `Admin@123` by default)

```powershell
npm run init-db
```

You can override seed creds with env vars:

```powershell
$env:SEED_ADMIN_USER = 'youradmin'; $env:SEED_ADMIN_PASS = 'StrongPass!123'; npm run init-db
```

3. Start the server

```powershell
npm start
```

4. Open http://localhost:3000

Notes
- For development, use `npm run dev` (requires `nodemon`).
- Change the `SESSION_SECRET` env var in production.
- The DB file is at `data/database.sqlite`.

Account activation and email
- New user registrations are stored as inactive by default. An activation link (JWT-based) will be generated and emailed to the supplied address if SMTP is configured. If no SMTP is configured the activation URL will be logged to the server console for testing.
- Configure SMTP env vars to enable real email sending:
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` (true/false) and optionally `SMTP_FROM`.
- JWT secret: set `JWT_SECRET` (or `SESSION_SECRET`) in the environment to sign activation tokens.

Migrations to Microsoft SQL Server
- This repo includes a migration script at `db/migrate_sqlserver.js` that will:
  1) Connect to your SQL Server using a connection string (pass as first arg or set `SQLSERVER_CONN` env var).
  2) Create `users` and `posts` tables if they do not exist.
  3) Optionally migrate existing data from the local SQLite DB at `data/database.sqlite` into SQL Server.

Run the migration locally (PowerShell):

```powershell
# Option A: pass the connection string (inline). Beware of escaping in PowerShell;
# wrap the connection string in double-quotes.
node db/migrate_sqlserver.js "Data Source=DESKTOP-IF07HU6\\SQLEXPRESS;Integrated Security=True;Persist Security Info=False;Pooling=False;MultipleActiveResultSets=True;Encrypt=True;TrustServerCertificate=True;Application Name=SQLServer;Column Encryption Setting=Enabled;Command Timeout=0"

# Option B: set environment var then run (recommended for long/complex strings)
$env:SQLSERVER_CONN = 'Data Source=DESKTOP-IF07HU6\\SQLEXPRESS;Integrated Security=True;Persist Security Info=False;Pooling=False;MultipleActiveResultSets=True;Encrypt=True;TrustServerCertificate=True;Application Name=SQLServer;Column Encryption Setting=Enabled;Command Timeout=0'
node db/migrate_sqlserver.js

# or using npm script (after setting the env var):
$env:SQLSERVER_CONN = '<your-conn-string>'
npm run migrate:sqlserver
```

Security note: run the migration from a machine that can reach your SQL Server and that you trust. The migration script will attempt to avoid creating duplicate records by checking username/email or title/created_at.

Next steps I can do for you
- Add a migration rollback script and versioned migrations (knex or umzug).
- Configure the app to switch to SQL Server in production (provide code to use `mssql` instead of SQLite based on env var).
- Add a secure way to store connection strings (Azure Key Vault, environment, or user secrets).
