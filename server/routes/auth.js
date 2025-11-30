const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

// Register
router.post('/register', async (req, res) => {
  const db = req.db;
  const { username, password, role } = req.body;

  if (!username || !password || !role)
    return res.status(400).json({ error: 'Missing fields' });

  if (!['customer', 'agent', 'marketer'].includes(role))
    return res.status(400).json({ error: 'Invalid role' });

  const hashed = await bcrypt.hash(password, 10);

  const query = `INSERT INTO users (username,password,role) VALUES (?,?,?)`;
  db.run(query, [username, hashed, role], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE'))
        return res.status(400).json({ error: 'User exists' });

      return res.status(500).json({ error: 'DB error' });
    }

    const user = { id: this.lastID, username, role };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

    res.json({ user, token });
  });
});

// Login
router.post('/login', (req, res) => {
  const db = req.db;
  const { username, password } = req.body;

  db.get(
    'SELECT * FROM users WHERE username = ?',
    [username],
    async (err, row) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      if (!row) return res.status(400).json({ error: 'Invalid login' });

      const ok = await bcrypt.compare(password, row.password);
      if (!ok) return res.status(400).json({ error: 'Invalid login' });

      const user = { id: row.id, username: row.username, role: row.role };
      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

      res.json({ user, token });
    }
  );
});

module.exports = router;

