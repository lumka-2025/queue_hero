// server/db/database.js
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname);
const DB_PATH = path.join(DB_DIR, 'queue_hero.db');
const MIGRATIONS = path.join(DB_DIR, 'migrations.sql');

// Ensure DB directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Run migrations ONCE if database does not exist
function runMigrations() {
  const needsCreation = !fs.existsSync(DB_PATH);
  const db = new sqlite3.Database(DB_PATH);

  if (needsCreation && fs.existsSync(MIGRATIONS)) {
    const sql = fs.readFileSync(MIGRATIONS, 'utf8');
    db.exec(sql, (err) => {
      if (err) console.error('❌ DB Migration Error:', err);
      else console.log('✅ Database created & migrations applied.');
      db.close();
    });
  } else {
    db.close();
  }
}

runMigrations();

// Export DB instance
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Failed to connect to SQLite DB:', err);
  } else {
    console.log('📦 SQLite DB Loaded →', DB_PATH);
  }
});

module.exports = db;

