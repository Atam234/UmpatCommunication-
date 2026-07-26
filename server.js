// UMPAT Communication - Server
// Ito ang "utak" ng buong app. Pinapatakbo ito gamit ang: node server.js

const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Static Files ---
// I-serve ang lahat ng static files mula sa "public" folder (html, css, js)
app.use(express.static(path.join(__dirname, 'public')));

// --- Fallback Root Route ---
// Siguraduhin na ilalabas ang index.html kapag in-access ang main URL ("/")
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('UMPAT Communication Server is Running! (Siguraduhing may index.html sa public folder)');
  }
});

// --- Piliin kung HTTP o HTTPS gagamitin ---
// Pag nasa cloud service tulad ng Render, gagamit ng HTTP dahil Render proxy na ang nag-aayos ng SSL/HTTPS.
const certPath = path.join(__dirname, 'cert.pem');
const keyPath = path.join(__dirname, 'key.pem');

let server;
let usingHttps = false;

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  server = https.createServer(
    {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
    },
    app
  );
  usingHttps = true;
} else {
  server = http.createServer(app);
}

const io = new Server(server, {
  cors: { origin: '*' },
});

// --- Listahan ng mga online na user ---
const onlineUsers = new Map();

function broadcastUserList() {
  const users = Array.from(onlineUsers.entries()).map(([id, name]) => ({ id, name }));
  io.emit('user-list', users);
}

io.on('connection', (socket) => {
  console.log(`[+] Bagong koneksyon: ${socket.id}`);

  socket.on('join', (username) => {
    const cleanName = String(username || 'Anonymous').slice(0, 30);
    onlineUsers.set(socket.id, cleanName);
    console.log(`[+] Sumali si "${cleanName}" (${socket.id})`);
    broadcastUserList();
  });

  // --- Text Chat ---
  socket.on('chat-message', ({ to, message }) => {
    if (!to || !message) return;
    const fromName = onlineUsers.get(socket.id) || 'Unknown';
    io.to(to).emit('chat-message', {
      from: socket.id,
      fromName,
      message: String(message).slice(0, 2000),
      timestamp: Date.now(),
    });
  });

  // --- WebRTC Signaling (para sa video/voice call) ---
  socket.on('call-user', ({ to, offer }) => {
    const fromName = onlineUsers.get(socket.id) || 'Unknown';
    io.to(to).emit('incoming-call', { from: socket.id, fromName, offer });
  });

  socket.on('answer-call', ({ to, answer }) => {
    io.to(to).emit('call-answered', { from: socket.id, answer });
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    if (!to) return;
    io.to(to).emit('ice-candidate', { from: socket.id, candidate });
  });

  socket.on('end-call', ({ to }) => {
    if (!to) return;
    io.to(to).emit('call-ended', { from: socket.id });
  });

  socket.on('disconnect', () => {
    const name = onlineUsers.get(socket.id);
    onlineUsers.delete(socket.id);
    console.log(`[-] Umalis si "${name}" (${socket.id})`);
    broadcastUserList();
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const proto = usingHttps ? 'https' : 'http';
  console.log('==================================================');
  console.log('  UMPAT Communication server - GUMAGANA NA!');
  console.log('==================================================');
  console.log(`  Protocol : ${proto.toUpperCase()}`);
  console.log(`  Port     : ${PORT}`);
  console.log('==================================================');
});
  
