const { Server } = require('socket.io');
const { verifyToken } = require('../middleware/auth');
const { registerGameHandlers } = require('./gameHandler');

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
    pingTimeout: 20000,
    pingInterval: 10000,
  });

  // --- Auth middleware for all sockets ---
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = verifyToken(token);
      // Block expired guest tokens
      if (payload.is_guest && payload.exp && Date.now() / 1000 > payload.exp) {
        return next(new Error('Guest session expired'));
      }
      socket.user = payload;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.user.username} (${socket.id})`);
    registerGameHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: ${socket.user.username} - ${reason}`);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

module.exports = { initSocket, getIO };
