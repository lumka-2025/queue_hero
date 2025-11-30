const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

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

// Marketer adds booking
router.post('/bookings', auth, (req, res) => {
  if (req.user.role !== 'marketer')
    return res.status(403).json({ error: 'Not allowed' });

  const db = req.db;
  const { title, location, details } = req.body;

  if (!title || !location)
    return res.status(400).json({ error: 'Missing fields' });

  db.run(
    `INSERT INTO marketer_bookings (marketer_id, title, location, details)
     VALUES (?, ?, ?, ?)`,
    [req.user.id, title, location, details || ''],
    function (err) {
      if (err) return res.status(500).json({ error: 'DB error' });

      db.get(
        `SELECT * FROM marketer_bookings WHERE id = ?`,
        [this.lastID],
        (err, row) => {
          res.json(row);
        }
      );
    }
  );
});

module.exports = router;

