-- migrations.sql for Queue Hero
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('customer','agent','marketer')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  agent_id INTEGER,
  description TEXT,
  location TEXT,
  status TEXT DEFAULT 'pending',
  eta TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(agent_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS marketer_bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  marketer_id INTEGER NOT NULL,
  title TEXT,
  location TEXT,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(marketer_id) REFERENCES users(id)
);

