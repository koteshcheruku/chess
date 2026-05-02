import { useEffect, useCallback } from 'react';
import { getSocket } from '../socket/socket';

/**
 * Subscribe to a socket event. Automatically unsubscribes on cleanup.
 * @param {string} event
 * @param {Function} handler
 */
export function useSocketEvent(event, handler) {
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, [event, handler]);
}

/**
 * Emit a socket event.
 * Returns an emit function that is stable across renders.
 */
export function useSocketEmit() {
  return useCallback((event, data) => {
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit(event, data);
    } else {
      console.warn(`[Socket] Cannot emit "${event}": not connected`);
    }
  }, []);
}
