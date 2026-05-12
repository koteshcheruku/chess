import axios from 'axios';
import { disconnectSocket, connectSocket } from '../socket/socket';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
});

// ---- Request interceptor: attach access token ----
api.interceptors.request.use((config) => {
  const raw = localStorage.getItem('chess-auth');
  if (raw) {
    try {
      const { state } = JSON.parse(raw);
      if (state?.accessToken) {
        config.headers.Authorization = `Bearer ${state.accessToken}`;
      }
    } catch { /* ignore */ }
  }
  return config;
});

// ---- Response interceptor: handle 401 with token refresh ----
let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }
      original._retry = true;
      isRefreshing = true;

      try {
        const raw = localStorage.getItem('chess-auth');
        const { state } = raw ? JSON.parse(raw) : {};
        if (!state?.refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
          refreshToken: state.refreshToken,
        });

        // Persist new tokens
        const updated = { ...state, accessToken: data.accessToken, refreshToken: data.refreshToken };
        localStorage.setItem('chess-auth', JSON.stringify({ state: updated, version: 0 }));

        // Reconnect socket with fresh token so real-time connections don't stay broken
        disconnectSocket();
        connectSocket(data.accessToken);

        processQueue(null, data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Clear auth and redirect to login
        localStorage.removeItem('chess-auth');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
