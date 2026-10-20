const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database'); // Imports the file above

const app = express();
app.use(cors());
app.use(express.json());

// Keep this secret!
const JWT_SECRET = "super_secret_key_change_this_later";

// Middleware to check if a user is logged in
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// 1. ROUTE: Register a new user
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const info = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hashedPassword);
    res.json({ id: info.lastInsertRowid, username });
  } catch (err) {
    res.status(400).json({ error: "Username already exists" });
  }
});

// 2. ROUTE: Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
  res.json({ token, id: user.id, username: user.username });
});

// 3. ROUTE: Create a poll (Requires Login)
// 5. ROUTE: Get all polls (Requires Login)
app.get('/api/polls', authenticateToken, (req, res) => {
  // Only get polls owned by the logged-in user
  const polls = db.prepare('SELECT * FROM polls WHERE owner_id = ?').all(req.user.id);
  res.json(polls);
});
app.post('/api/polls', authenticateToken, (req, res) => {
  const { question, options } = req.body;
  const info = db.prepare('INSERT INTO polls (question, options, owner_id) VALUES (?, ?, ?)')
                  .run(question, JSON.stringify(options), req.user.id);
  res.json({ id: info.lastInsertRowid });
});

// 4. ROUTE: Delete a poll (ONLY the owner can do this)
// 5. ROUTE: Get all polls (Requires Login)
app.get('/api/polls', authenticateToken, (req, res) => {
  // Only get polls owned by the logged-in user
  const polls = db.prepare('SELECT * FROM polls WHERE owner_id = ?').all(req.user.id);
  res.json(polls);
});
app.delete('/api/polls/:id', authenticateToken, (req, res) => {
  const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(req.params.id);
  if (!poll) return res.status(404).json({ error: "Poll not found" });
  
  // THE REAL SECURITY CHECK:
  if (poll.owner_id !== req.user.id) {
    return res.status(403).json({ error: "You do not have permission to delete this poll" });
  }

  db.prepare('DELETE FROM polls WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Start the server
// 6. ROUTE: Get a SINGLE poll (Public - no login required for sharing)
app.get('/api/polls/:id', (req, res) => {
  const poll = db.prepare('SELECT id, question, options, votes FROM polls WHERE id = ?').get(req.params.id);
  if (!poll) return res.status(404).json({ error: "Poll not found" });
  
  // If votes is null (first time), initialize it with zeros
  if (!poll.votes) {
    const optionsArray = JSON.parse(poll.options);
    poll.votes = JSON.stringify(new Array(optionsArray.length).fill(0));
  }
  res.json(poll);
});

// 7. ROUTE: Submit a vote (Public)
app.post('/api/polls/:id/vote', (req, res) => {
  const { optionIndex } = req.body;
  const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(req.params.id);
  if (!poll) return res.status(404).json({ error: "Poll not found" });

  let votes = poll.votes ? JSON.parse(poll.votes) : new Array(JSON.parse(poll.options).length).fill(0);
  votes[optionIndex] += 1; // Add 1 to the selected option

  db.prepare('UPDATE polls SET votes = ? WHERE id = ?').run(JSON.stringify(votes), poll.id);
  res.json({ success: true, votes });
});
app.listen(3000, () => console.log('Backend running on http://localhost:3000'));