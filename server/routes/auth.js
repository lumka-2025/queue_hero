const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'db', 'debate.db');
const db = new sqlite3.Database(DB_PATH);

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

// ensure tables exist (idempotent)
db.exec(`
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('customer','agent','marketer')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
`);

router.post('/register', (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'username, password, role required' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const stmt = `INSERT INTO users (username, password_hash, role) VALUES (?,?,?)`;
  db.run(stmt, [username, hash, role], function (err) {
    if (err) {
      if (String(err.message).includes('UNIQUE')) {
        return res.status(409).json({ error: 'user exists' });
      }
      return res.status(500).json({ error: 'db error', detail: err.message });
    }
    res.json({ ok: true, id: this.lastID });
  });
});

router.post('/login', (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'username, password, role required' });
  }

  db.get(`SELECT * FROM users WHERE username = ? AND role = ?`, [username, role], (err, row) => {
    if (err) return res.status(500).json({ error: 'db error' });
    if (!row) return res.status(401).json({ error: 'invalid credentials' });
    const ok = bcrypt.compareSync(password, row.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });

    const token = jwt.sign({ uid: row.id, role: row.role, username: row.username }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ ok: true, token, role: row.role, username: row.username });
  });
});

module.exports = router;

