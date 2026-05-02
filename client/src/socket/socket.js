import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  return socket;
}

export function connectSocket(token) {
  if (socket?.connected) return socket;

  const SOCKET_URL = import.meta.env.VITE_API_URL || window.location.origin;

  socket = io(SOCKET_URL, {
    auth: { token },
    autoConnect: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 2000,
    // Include polling as fallback — websocket-only fails in some dev proxy configs
    transports: ['polling', 'websocket'],
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
