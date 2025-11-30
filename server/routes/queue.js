const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

// Middleware
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Missing token' });

  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Create request
router.post('/requests', auth, (req, res) => {
  const db = req.db;
  const io = req.io;

  const { description, location } = req.body;
  if (!description || !location)
    return res.status(400).json({ error: 'Missing fields' });

  const sql = `
    INSERT INTO requests (user_id, description, location)
    VALUES (?, ?, ?)
  `;

  db.run(sql, [req.user.id, description, location], function (err) {
    if (err) return res.status(500).json({ error: 'DB error' });

    db.get(
      `SELECT * FROM requests WHERE id = ?`,
      [this.lastID],
      (err, row) => {
        if (row) io.emit('new_request', row);
        res.json(row);
      }
    );
  });
});

// Get requests
router.get('/requests', auth, (req, res) => {
  const db = req.db;

  // agent sees all pending
  if (req.user.role === 'agent') {
    db.all(
      `SELECT * FROM requests WHERE status != 'completed' ORDER BY created_at DESC`,
      [],
      (err, rows) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        res.json(rows);
      }
    );
  }

  // customer only sees their own
  else {
    db.all(
      `SELECT * FROM requests WHERE user_id = ? ORDER BY created_at DESC`,
      [req.user.id],
      (err, rows) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        res.json(rows);
      }
    );
  }
});

// Agent assigns
router.post('/requests/:id/assign', auth, (req, res) => {
  if (req.user.role !== 'agent')
    return res.status(403).json({ error: 'Not allowed' });

  const db = req.db;
  const io = req.io;
  const { eta } = req.body;

  db.run(
    `UPDATE requests SET agent_id = ?, status = 'in_progress', eta = ? WHERE id = ?`,
    [req.user.id, eta || null, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: 'DB error' });

      db.get(
        `SELECT * FROM requests WHERE id = ?`,
        [req.params.id],
        (err, row) => {
          if (row) io.emit('update_request', row);
          res.json(row);
        }
      );
    }
  );
});

// Agent completes
router.post('/requests/:id/complete', auth, (req, res) => {
  if (req.user.role !== 'agent')
    return res.status(403).json({ error: 'Not allowed' });

  const db = req.db;
  const io = req.io;

  db.run(
    `UPDATE requests SET status = 'completed' WHERE id = ?`,
    [req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: 'DB error' });

      db.get(
        `SELECT * FROM requests WHERE id = ?`,
        [req.params.id],
        (err, row) => {
          if (row) io.emit('update_request', row);
          res.json(row);
        }
      );
    }
  );
});

module.exports = router;

