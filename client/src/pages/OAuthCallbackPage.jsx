import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { connectSocket } from '../socket/socket';

/**
 * /oauth-callback
 * Google redirects the browser here after successful OAuth.
 * We read the JWT from the URL, store it, then redirect home.
 */
export default function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    const userRaw = params.get('user');
    const error = params.get('error');

    if (error || !token || !userRaw) {
      navigate('/login?error=oauth_failed');
      return;
    }

    try {
      const user = JSON.parse(decodeURIComponent(userRaw));
      setAuth({ user, accessToken: token, refreshToken: null });
      connectSocket(token);
      navigate('/', { replace: true });
    } catch {
      navigate('/login?error=oauth_failed');
    }
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner spinner-lg" />
    </div>
  );
}
