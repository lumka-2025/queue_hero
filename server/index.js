// server/index.js
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

// Import database (migrations already run inside)
const db = require('./db/database');

// Routes
const authRoutes = require('./routes/auth');
const queueRoutes = require('./routes/queue');
const marketerRoutes = require('./routes/marketer');

// ENV
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';
const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://qhero.co.za',
  'https://queue-hero.onrender.com'
];

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error('CORS blocked: ' + origin));
    },
    credentials: true
  })
);

// Inject DB + IO into routes
app.use((req, res, next) => {
  req.db = db;
  req.io = io;
  next();
});

// Main routes
app.use('/api', authRoutes);
app.use('/api', queueRoutes);
app.use('/api', marketerRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Start server
server.listen(PORT, () => {
  console.log(`🔥 Queue Hero API running on port ${PORT}`);
});

