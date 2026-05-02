import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { connectSocket, disconnectSocket } from '../socket/socket';
import api from '../services/api';

export function useAuth() {
  const { user, accessToken, setAuth, clearAuth, isAuthenticated, isGuest, updateUser } = useAuthStore();
  const navigate = useNavigate();

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAuth(data);
    connectSocket(data.accessToken);
    return data;
  }, [setAuth]);

  const register = useCallback(async (username, email, password) => {
    const { data } = await api.post('/auth/register', { username, email, password });
    setAuth(data);
    connectSocket(data.accessToken);
    return data;
  }, [setAuth]);

  const loginAsGuest = useCallback(async () => {
    const { data } = await api.post('/auth/guest');
    setAuth({ user: data.user, accessToken: data.accessToken, refreshToken: null });
    connectSocket(data.accessToken);
    return data;
  }, [setAuth]);

  const logout = useCallback(async () => {
    try {
      const { refreshToken } = useAuthStore.getState();
      await api.post('/auth/logout', { refreshToken });
    } catch { /* best effort */ }
    disconnectSocket();
    clearAuth();
    navigate('/login');
  }, [clearAuth, navigate]);

  return { user, accessToken, login, register, loginAsGuest, logout, isAuthenticated, isGuest, updateUser };
}
