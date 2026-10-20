const API_URL = 'http://localhost:3000/api';

// --- AUTHENTICATION LOGIC (Unchanged) ---
async function register() {
  const username = document.getElementById('reg-username').value;
  const password = document.getElementById('reg-password').value;
  const res = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (res.ok) alert('Registration successful! Please log in.');
  else alert(data.error);
}

async function login() {
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const res = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (res.ok) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    checkAuth();
  } else alert(data.error);
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  window.location.href = window.location.pathname; // Go back to home
}

// --- POLL LOGIC ---
async function createPoll() {
  const token = localStorage.getItem('token');
  const question = document.getElementById('poll-question').value;
  const options = document.getElementById('poll-options').value.split('\n').filter(opt => opt.trim() !== '');
  
  if (!question || options.length < 2) return alert('Please enter a question and at least 2 options.');

  const res = await fetch(`${API_URL}/polls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ question, options })
  });

  if (res.ok) {
    document.getElementById('poll-question').value = '';
    document.getElementById('poll-options').value = '';
    loadPolls();
  }
}

async function loadPolls() {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}/polls`, { headers: { 'Authorization': `Bearer ${token}` } });
  
  if (res.ok) {
    const polls = await res.json();
    const container = document.getElementById('polls-list');
    container.innerHTML = '';

    if (polls.length === 0) {
      container.innerHTML = '<p>You have no polls yet.</p>';
      return;
    }

    polls.forEach(poll => {
      const div = document.createElement('div');
      div.className = 'poll-card';
      
      // Add Share Button!
      div.innerHTML = `
        <h4>${poll.question}</h4>
        <button onclick="sharePoll(${poll.id})" class="btn-secondary" style="margin-bottom: 15px; background-color: #1f6feb; color: white;">🔗 Copy Share Link</button>
        <button class="delete-btn" onclick="deletePoll(${poll.id})">Delete Poll</button>
      `;
      container.appendChild(div);
    });
  }
}

// --- SHARE & VOTE LOGIC (NEW) ---

function sharePoll(id) {
  // Construct the URL to share
  const shareUrl = `${window.location.origin}${window.location.pathname}?poll=${id}`;
  navigator.clipboard.writeText(shareUrl);
  alert(`Link copied!\n\n${shareUrl}\n\nSend this to a friend to let them vote.`);
}

async function loadVoteScreen(pollId) {
  const res = await fetch(`${API_URL}/polls/${pollId}`);
  if (!res.ok) return alert('Poll not found.');

  const poll = await res.json();
  const options = JSON.parse(poll.options);
  
  document.getElementById('vote-question').innerText = poll.question;
  const optionsContainer = document.getElementById('vote-options');
  optionsContainer.innerHTML = '';

  options.forEach((opt, index) => {
    optionsContainer.innerHTML += `
      <label style="display: block; padding: 10px; border: 1px solid #ccc; margin-bottom: 10px; border-radius: 5px; cursor: pointer;">
        <input type="radio" name="vote" value="${index}" required> ${opt}
      </label>
    `;
  });
}

async function submitVote(event) {
  event.preventDefault();
  const pollId = new URLSearchParams(window.location.search).get('poll');
  const selectedOption = document.querySelector('input[name="vote"]:checked').value;

  const res = await fetch(`${API_URL}/polls/${pollId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ optionIndex: parseInt(selectedOption) })
  });

  if (res.ok) {
    document.getElementById('vote-form').style.display = 'none';
    document.getElementById('vote-message').innerText = "✅ Vote submitted successfully!";
  }
}

// --- INITIALIZATION ---
function checkAuth() {
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');
  const urlParams = new URLSearchParams(window.location.search);
  const pollId = urlParams.get('poll');

  // If a poll ID is in the URL, show the VOTE screen ONLY
  if (pollId) {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('create-section').style.display = 'none';
    document.getElementById('polls-section').style.display = 'none';
    document.getElementById('vote-section').style.display = 'block';
    document.querySelector('header nav').style.display = 'none'; // Hide login/logout nav
    loadVoteScreen(pollId);
    return;
  }

  // Otherwise, show the normal app
  if (token) {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('create-section').style.display = 'block';
    document.getElementById('polls-section').style.display = 'block';
    document.getElementById('nav-auth').style.display = 'block';
    document.getElementById('user-greeting').innerText = `Logged in as: ${username}`;
    loadPolls();
  } else {
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('create-section').style.display = 'none';
    document.getElementById('polls-section').style.display = 'none';
    document.getElementById('nav-auth').style.display = 'none';
  }
}

checkAuth();