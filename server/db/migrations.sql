-- USERS: add role if not present
-- (SQLite lacks easy "ADD COLUMN IF NOT EXISTS", but adding twice is harmless if you rebuilt DB)
-- If the column already exists you'll see a warning; safe to ignore.
PRAGMA foreign_keys = ON;

-- Create users table if not exists (kept compatible with your current schema)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'customer'
);

-- Queue requests for “Queue Hero” (existing or confirm)
CREATE TABLE IF NOT EXISTS queue_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  location TEXT NOT NULL,
  store TEXT NOT NULL,
  queue_number TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES users(id)
);

-- Marketer bookings (NEW)
CREATE TABLE IF NOT EXISTS marketer_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  location TEXT NOT NULL,
  date TEXT NOT NULL,  -- ISO date (YYYY-MM-DD)
  time TEXT NOT NULL,  -- HH:mm
  branding TEXT,       -- short brief, e.g., "Spar activation, gold/black"
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES users(id)
);
-- Queue Requests
CREATE TABLE IF NOT EXISTS queue_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customerId INTEGER NOT NULL,
  location TEXT NOT NULL,
  store TEXT NOT NULL,
  queueNumber TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  agentId INTEGER,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Brand Bookings
CREATE TABLE IF NOT EXISTS brand_bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brandName TEXT NOT NULL,
  campaignDetails TEXT NOT NULL,
  location TEXT,
  status TEXT DEFAULT 'pending',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

