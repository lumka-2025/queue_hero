// server/routes/requests.js
const express = require('express');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const router = express.Router();
const SECRET = 'queueHeroSecret';
const DB_PATH = path.join(__dirname, '..', 'db', 'debate.db');
const db = new sqlite3.Database(DB_PATH);

// Auth middleware
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

router.get('/requests', auth, (req, res) => {
  db.all('SELECT * FROM requests WHERE user_id = ? ORDER BY created_at DESC', [req.user.uid], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, requests: rows });
  });
});

router.post('/requests', auth, (req, res) => {
  const { details } = req.body || {};
  if (!details) return res.status(400).json({ success: false, message: 'Details required' });
  db.run('INSERT INTO requests (user_id, details) VALUES (?, ?)', [req.user.uid, details], function(err) {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, id: this.lastID });
  });
});

router.get('/requests/all', auth, (req, res) => {
  if (req.user.role !== 'agent') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  db.all(`
    SELECT requests.*, users.username
    FROM requests
    JOIN users ON users.id = requests.user_id
    ORDER BY created_at DESC
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, requests: rows });
  });
});

router.put('/requests/:id/done', auth, (req, res) => {
  if (req.user.role !== 'agent') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  db.run(`UPDATE requests SET details = details || ' [DONE]' WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true });
  });
});

router.delete('/requests/:id', auth, (req, res) => {
  if (req.user.role !== 'agent') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  db.run(`DELETE FROM requests WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true });
  });
});


module.exports = router;

