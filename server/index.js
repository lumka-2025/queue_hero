const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http');

const authRoutes = require('./routes/auth');
const queueRoutes = require('./routes/queue');
const requestsRoutes = require('./routes/requests');

const app = express();
const server = http.createServer(app);

// --- core middleware ---
app.use(cors());
app.use(express.json());

// --- static client ---
const clientDir = path.join(__dirname, '..', 'client', 'public');
app.use(express.static(clientDir));

// --- api routes ---
app.use('/api', authRoutes);
app.use('/api', queueRoutes);
app.use('/api', requestsRoutes);

// --- health ---
app.get('/health', (_, res) => res.json({ ok: true }));

// --- SPA-ish welcome redirect ---
app.get('/', (_, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

// --- hard 404 for unknown API ---
app.use('/api/*', (_, res) => res.status(404).json({ error: 'Not found' }));

// --- start ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});

