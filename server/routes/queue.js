const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'db', 'debate.db');
const db = new sqlite3.Database(DB_PATH);

const router = express.Router();

// ensure tables (idempotent)
db.exec(`
CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending|accepted|completed|cancelled
  assigned_agent_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(assigned_agent_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_requests_user ON requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
`);

// create request (customer)
router.post('/requests', (req, res) => {
  const { user_id, details } = req.body || {};
  if (!user_id || !details) return res.status(400).json({ error: 'user_id and details required' });
  const stmt = `INSERT INTO requests (user_id, details) VALUES (?,?)`;
  db.run(stmt, [user_id, details], function (err) {
    if (err) return res.status(500).json({ error: 'db error', detail: err.message });
    res.json({ ok: true, id: this.lastID });
  });
});

// list my requests (customer)
router.get('/requests', (req, res) => {
  const uid = Number(req.query.user_id);
  if (!uid) return res.status(400).json({ error: 'user_id required' });
  db.all(`SELECT r.*, u.username AS assigned_agent
          FROM requests r
          LEFT JOIN users u ON u.id = r.assigned_agent_id
          WHERE r.user_id = ?
          ORDER BY r.created_at DESC`, [uid], (err, rows) => {
    if (err) return res.status(500).json({ error: 'db error' });
    res.json({ ok: true, rows });
  });
});

// agent: open jobs
router.get('/agent/open', (_req, res) => {
  db.all(`SELECT r.*, c.username as customer
          FROM requests r
          JOIN users c ON c.id = r.user_id
          WHERE r.status = 'pending'
          ORDER BY r.created_at ASC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'db error' });
    res.json({ ok: true, rows });
  });
});

// agent: accept job
router.post('/agent/accept', (req, res) => {
  const { agent_id, request_id } = req.body || {};
  if (!agent_id || !request_id) return res.status(400).json({ error: 'agent_id and request_id required' });
  const sql = `UPDATE requests
               SET status = 'accepted', assigned_agent_id = ?, updated_at = CURRENT_TIMESTAMP
               WHERE id = ? AND status = 'pending'`;
  db.run(sql, [agent_id, request_id], function (err) {
    if (err) return res.status(500).json({ error: 'db error' });
    if (this.changes === 0) return res.status(409).json({ error: 'already taken or not pending' });
    res.json({ ok: true });
  });
});

// agent: complete job
router.post('/agent/complete', (req, res) => {
  const { agent_id, request_id } = req.body || {};
  if (!agent_id || !request_id) return res.status(400).json({ error: 'agent_id and request_id required' });
  const sql = `UPDATE requests
               SET status = 'completed', updated_at = CURRENT_TIMESTAMP
               WHERE id = ? AND assigned_agent_id = ? AND status = 'accepted'`;
  db.run(sql, [request_id, agent_id], function (err) {
    if (err) return res.status(500).json({ error: 'db error' });
    if (this.changes === 0) return res.status(409).json({ error: 'not accepted by you or wrong status' });
    res.json({ ok: true });
  });
});

module.exports = router;

