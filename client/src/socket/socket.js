import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  return socket;
}

export function connectSocket(token) {
  if (socket) {
    // Socket instance already exists — just ensure it's connected with the latest token
    if (!socket.connected) {
      socket.auth = { token };
      socket.connect();
    }
    return socket;
  }

  const SOCKET_URL = import.meta.env.VITE_API_URL || window.location.origin;

  socket = io(SOCKET_URL, {
    auth: { token },
    autoConnect: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 2000,
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

/**
 * Update the JWT used for socket auth without destroying the socket instance.
 * All registered event listeners are preserved across the reconnect.
 * Called when the access token is refreshed (interceptor dispatches 'auth_refresh').
 */
export function updateSocketToken(newToken) {
  if (!socket) {
    // No socket yet — create one fresh
    connectSocket(newToken);
    return;
  }
  socket.auth = { token: newToken };
  // Disconnect then reconnect the SAME instance — listeners stay registered
  socket.disconnect();
  socket.connect();
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

