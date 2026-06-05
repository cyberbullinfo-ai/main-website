// Combined Express + WebSocket server with lightweight JSON file storage
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');

const DB_PATH = path.join(__dirname, 'db.json');

function readDB() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch(e) { return { users: {}, invites: {} }; }
}

function writeDB(db) { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8'); }

const app = express();
const corsOptions = {
  origin: true,
  methods: ['GET','POST','OPTIONS','PUT','DELETE'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
// Serve static site files from project root so pages and API share origin
app.use(express.static(path.join(__dirname)));

// Debug logging for API methods
app.use('/api', (req, res, next) => {
  console.log(`[API] ${req.method} ${req.originalUrl}`);
  next();
});
app.use('/api', (req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS,PUT,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    return res.sendStatus(204);
  }
  next();
});

// Simple ping
app.get('/api/ping', (req, res) => res.json({ok:true}));

// Register
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if(!username || !password) return res.status(400).json({error:'missing'});
  const db = readDB();
  if(db.users[username]) return res.status(409).json({error:'exists'});
  db.users[username] = { password, friends: [], data: {} };
  writeDB(db);
  res.json({ok:true});
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const db = readDB();
  const u = db.users[username];
  if(!u || u.password !== password) return res.status(401).json({error:'invalid'});
  res.json({ok:true});
});

// list users
app.get('/api/users', (req, res) => {
  const db = readDB();
  res.json(Object.keys(db.users));
});

app.get('/api/user/:username', (req, res) => {
  const db = readDB();
  const u = db.users[req.params.username];
  if(!u) return res.status(404).json({error:'not found'});
  res.json({ username: req.params.username, data: u.data });
});

// friends
app.get('/api/friends/:username', (req, res) => {
  const db = readDB(); const u = db.users[req.params.username]; if(!u) return res.status(404).json([]);
  res.json(u.friends || []);
});
app.post('/api/friends/:username', (req, res) => {
  const friend = req.body.friend; if(!friend) return res.status(400).json({error:'missing'});
  const db = readDB(); const u = db.users[req.params.username]; if(!u) return res.status(404).json({error:'no user'});
  if(!db.users[friend]) return res.status(404).json({error:'no friend user'});
  u.friends = u.friends || []; if(!u.friends.includes(friend)) u.friends.push(friend);
  writeDB(db); res.json({ok:true});
});
app.delete('/api/friends/:username/:friend', (req, res) => {
  const db = readDB(); const u = db.users[req.params.username]; if(!u) return res.status(404).json({error:'no user'});
  u.friends = (u.friends || []).filter(x=>x!==req.params.friend); writeDB(db); res.json({ok:true});
});

// invites
app.post('/api/invite', (req, res) => {
  const { from, to, game, roomId } = req.body; if(!from || !to || !game || !roomId) return res.status(400).json({error:'missing'});
  const db = readDB(); db.invites = db.invites || {}; db.invites[to] = db.invites[to] || [];
  db.invites[to].push({from, game, roomId, ts: Date.now()}); writeDB(db); res.json({ok:true});
});
app.get('/api/invites/:username', (req, res) => {
  const db = readDB(); res.json(db.invites && db.invites[req.params.username] ? db.invites[req.params.username] : []);
});
app.delete('/api/invite/:username/:roomId', (req, res) => {
  const db = readDB(); db.invites = db.invites || {}; db.invites[req.params.username] = (db.invites[req.params.username] || []).filter(i=>i.roomId !== req.params.roomId); writeDB(db); res.json({ok:true});
});

// ===== Chat endpoints (simple, persisted in db.json) =====
app.post('/api/chat/global', (req, res) => {
  const { username, userKey, message } = req.body; if(!message) return res.status(400).json({error:'missing'});
  const db = readDB(); db.chat = db.chat || {}; db.chat.global = db.chat.global || [];
  const msg = { id: `msg-${Date.now()}-${Math.random()}`, username, userKey, message, timestamp: Date.now() };
  db.chat.global.push(msg);
  if(db.chat.global.length > 1000) db.chat.global = db.chat.global.slice(-1000);
  writeDB(db); res.json(msg);
});

app.get('/api/chat/global', (req, res) => {
  const db = readDB(); res.json((db.chat && db.chat.global) ? db.chat.global : []);
});

app.post('/api/chat/local', (req, res) => {
  const { username, userKey, schoolDomain, message } = req.body; if(!message||!schoolDomain) return res.status(400).json({error:'missing'});
  const db = readDB(); db.chat = db.chat || {}; db.chat.local = db.chat.local || {};
  db.chat.local[schoolDomain] = db.chat.local[schoolDomain] || [];
  const msg = { id: `msg-${Date.now()}-${Math.random()}`, username, userKey, schoolDomain, message, timestamp: Date.now() };
  db.chat.local[schoolDomain].push(msg);
  if(db.chat.local[schoolDomain].length > 1000) db.chat.local[schoolDomain] = db.chat.local[schoolDomain].slice(-1000);
  writeDB(db); res.json(msg);
});

app.get('/api/chat/local/:schoolDomain', (req, res) => {
  const db = readDB(); res.json((db.chat && db.chat.local && db.chat.local[req.params.schoolDomain]) ? db.chat.local[req.params.schoolDomain] : []);
});

// private messages stored per conversation
app.post('/api/chat/private', (req, res) => {
  const { senderKey, senderName, recipientKey, recipientName, message } = req.body; if(!message||!recipientKey) return res.status(400).json({error:'missing'});
  const db = readDB(); db.chat = db.chat || {}; db.chat.private = db.chat.private || {};
  const users = [senderKey, recipientKey].sort(); const key = `${users[0]}_${users[1]}`;
  db.chat.private[key] = db.chat.private[key] || [];
  const msg = { id: `msg-${Date.now()}-${Math.random()}`, senderKey, senderName, recipientKey, recipientName, message, timestamp: Date.now() };
  db.chat.private[key].push(msg);
  if(db.chat.private[key].length > 1000) db.chat.private[key] = db.chat.private[key].slice(-1000);
  writeDB(db); res.json(msg);
});

app.get('/api/chat/private/:userA/:userB', (req, res) => {
  const users = [req.params.userA, req.params.userB].sort(); const key = `${users[0]}_${users[1]}`;
  const db = readDB(); res.json((db.chat && db.chat.private && db.chat.private[key]) ? db.chat.private[key] : []);
});

// Save/update user profile globally
// Ensure preflight OPTIONS for /api/saveUser responds with CORS headers and 204
app.options('/api/saveUser', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS,PUT,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  return res.sendStatus(204);
});
app.post('/api/saveUser', (req, res) => {
  console.log('[API] saveUser payload', { userKey: req.body.userKey, method: req.method });
  const { userKey, userObj } = req.body;
  if(!userKey || !userObj) return res.status(400).json({error:'missing fields'});
  
  const db = readDB();
  db.users = db.users || {};
  db.users[userKey] = userObj;
  try {
    writeDB(db);
    res.json({success: true, userKey});
  } catch (err) {
    console.error('Failed to write DB in /api/saveUser', err);
    return res.status(500).json({ error: 'failed to persist user', detail: String(err && err.message ? err.message : err) });
  }
});
app.all('/api/saveUser', (req, res) => {
  if (req.method !== 'POST' && req.method !== 'OPTIONS') {
    console.warn('[API] saveUser wrong method', req.method);
    return res.status(405).json({ error: 'method not allowed', method: req.method });
  }
  res.status(404).json({ error: 'not found' });
});

// Get user profile globally
app.get('/api/getUser/:userKey', (req, res) => {
  const db = readDB();
  const user = (db.users && db.users[req.params.userKey]) || null;
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  // Do not expose sensitive fields such as password
  const safeUser = Object.assign({}, user);
  if (safeUser.password) delete safeUser.password;
  res.json(safeUser);
});

// Check password without exposing it
app.post('/api/checkPassword', (req, res) => {
  const { userKey, password } = req.body;
  if (!userKey || typeof password === 'undefined') return res.status(400).json({ error: 'missing fields' });
  const db = readDB();
  const user = (db.users && db.users[userKey]) || null;
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.password === password) return res.json({ ok: true });
  return res.status(401).json({ error: 'invalid' });
});

// Delete a single user globally
app.post('/api/deleteUser', (req, res) => {
  const { userKey } = req.body;
  if (!userKey) return res.status(400).json({ error: 'missing userKey' });
  const db = readDB();
  if (!db.users || !db.users[userKey]) {
    return res.status(404).json({ error: 'User not found' });
  }
  delete db.users[userKey];
  writeDB(db);
  res.json({ success: true, userKey });
});

// Clear all users
app.post('/api/clearAllUsers', (req, res) => {
  const db = readDB();
  db.users = {};
  writeDB(db);
  res.json({success: true});
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// waiting slots keyed by roomId
const waiting = new Map();

function send(ws, type, data) { try { ws.send(JSON.stringify({type, data})); } catch(e){} }

wss.on('connection', (ws) => {
  ws.on('message', (msg) => {
    let m = null; try { m = JSON.parse(msg); } catch(e){ return }
    const {type, data} = m;
    if(type === 'join') {
      const roomId = data && data.roomId ? String(data.roomId) : '__open__';
      if(!waiting.has(roomId)) {
        waiting.set(roomId, ws);
        send(ws, 'status', {msg:'Waiting for opponent...'});
      } else {
        const a = waiting.get(roomId);
        if(a === ws) return;
        waiting.delete(roomId);
        const b = ws;
        a.peer = b; b.peer = a;
        const host = Math.random() > 0.5 ? a : b;
        send(a, 'paired', {isHost: host === a});
        send(b, 'paired', {isHost: host === b});
      }
    } else if(type === 'paddle' || type === 'ball' || type === 'score') {
      if(ws.peer && ws.peer.readyState === WebSocket.OPEN) {
        send(ws.peer, type, data);
      }
    }
  });
  ws.on('close', () => {
    for(const [room, w] of waiting.entries()) if(w === ws) waiting.delete(room);
    if(ws.peer && ws.peer.readyState === WebSocket.OPEN) {
      try { ws.peer.send(JSON.stringify({type:'status', data:{msg:'Opponent disconnected'}})) } catch(e){}
      ws.peer.peer = null;
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server listening on http://localhost:' + PORT));

