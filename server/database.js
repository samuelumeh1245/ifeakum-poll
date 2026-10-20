const Database = require('better-sqlite3');
const db = new Database('polls.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  );
  CREATE TABLE IF NOT EXISTS polls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT,
    options TEXT,
    votes TEXT, -- NEW: Store votes as a JSON string
    owner_id INTEGER,
    FOREIGN KEY(owner_id) REFERENCES users(id)
  );
`);

module.exports = db;