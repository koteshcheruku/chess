import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { connectSocket } from './socket/socket';

import Navbar from './components/Navbar/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PlayPage from './pages/PlayPage';
import GamePage from './pages/GamePage';
import PuzzlePage from './pages/PuzzlePage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import ErrorPage from './pages/ErrorPage';

function RequireAuth({ children }) {
  const { accessToken } = useAuthStore();
  if (!accessToken) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  const { accessToken } = useAuthStore();

  // Reconnect socket on app mount if token exists
  React.useEffect(() => {
    if (accessToken) connectSocket(accessToken);
  }, [accessToken]);

  // Listen for background token refreshes — update socket auth without destroying the instance
  React.useEffect(() => {
    const handleRefresh = (e) => {
      import('./socket/socket').then(({ updateSocketToken }) => {
        updateSocketToken(e.detail.accessToken);
      });
    };
    window.addEventListener('auth_refresh', handleRefresh);
    return () => window.removeEventListener('auth_refresh', handleRefresh);
  }, []);

  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/play" element={<RequireAuth><PlayPage /></RequireAuth>} />
        <Route path="/game/:id" element={<RequireAuth><GamePage /></RequireAuth>} />
        <Route path="/puzzle" element={<RequireAuth><PuzzlePage /></RequireAuth>} />
        <Route path="/profile/:id" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
        <Route path="/oauth-callback" element={<OAuthCallbackPage />} />
        <Route path="/401" element={<ErrorPage type="401" />} />
        <Route path="/403" element={<ErrorPage type="403" />} />
        <Route path="*" element={<ErrorPage type="404" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
