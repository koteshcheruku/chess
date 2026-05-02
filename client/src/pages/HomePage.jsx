import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import './Page.css';

export default function HomePage() {
  const { user, accessToken } = useAuthStore();
  const { loginAsGuest } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      api.get(`/user/${user.id}/stats`).then(({ data }) => setStats(data)).catch(() => {});
    }
  }, [user?.id]);

  const handleGuest = async () => {
    setGuestLoading(true);
    try {
      await loginAsGuest();
      navigate('/play');
    } catch {
      setGuestLoading(false);
    }
  };

  if (!accessToken) {
    return (
      <main className="page">
        <section className="home-hero">
          <h1>Practice puzzles and improve your rating</h1>
          <p>Play real-time games, solve tactics, and track your progress. No account needed to start.</p>
          <div className="home-hero-actions">
            <Link to="/register" className="btn btn-primary btn-lg" id="cta-register">Create account</Link>
            <button
              className="btn btn-ghost btn-lg"
              onClick={handleGuest}
              disabled={guestLoading}
              id="cta-guest"
            >
              {guestLoading ? 'Loading...' : 'Play as guest'}
            </button>
            <Link to="/login" className="btn btn-ghost btn-lg" id="cta-login">Log in</Link>
          </div>
        </section>

        <section className="home-features">
          <div className="feature-card">
            <div className="feature-icon">♟</div>
            <h3>Real-time multiplayer</h3>
            <p>Play bullet, blitz, or rapid games against other players. Moves sync instantly.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🧩</div>
            <h3>Tactical puzzles</h3>
            <p>Puzzles matched to your rating. Solve them to improve your tactical vision.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h3>Play vs bot</h3>
            <p>6 bot levels from 300 to 1500. Pick your challenge and practice without pressure.</p>
          </div>
        </section>
      </main>
    );
  }

  // Logged in home
  return (
    <main className="page">
      <div className="home-logged-in">
        <div className="home-welcome">
          <h1>Welcome back, {user.username}</h1>
          {user.is_guest && (
            <div className="alert alert-info mt-4">
              Playing as guest. <Link to="/register">Create a free account</Link> to save your progress.
            </div>
          )}
        </div>

        {stats && (
          <div className="home-stats">
            <div className="stat-tile">
              <div className="stat-value">{user.rating ?? 1200}</div>
              <div className="stat-label">Rating</div>
            </div>
            <div className="stat-tile">
              <div className="stat-value">{stats.games?.total ?? 0}</div>
              <div className="stat-label">Games played</div>
            </div>
            <div className="stat-tile">
              <div className="stat-value">{stats.puzzles?.solved ?? 0}</div>
              <div className="stat-label">Puzzles solved</div>
            </div>
            <div className="stat-tile">
              <div className="stat-value">
                {stats.games?.total > 0
                  ? Math.round((stats.games.wins / stats.games.total) * 100) + '%'
                  : '—'}
              </div>
              <div className="stat-label">Win rate</div>
            </div>
          </div>
        )}

        <div className="home-quick-actions">
          <Link to="/play" className="quick-action-card" id="quick-play">
            <span className="quick-action-icon">♟</span>
            <div>
              <div className="quick-action-title">New game</div>
              <div className="quick-action-sub">Play vs human or bot</div>
            </div>
          </Link>
          <Link to="/puzzle" className="quick-action-card" id="quick-puzzle">
            <span className="quick-action-icon">🧩</span>
            <div>
              <div className="quick-action-title">Solve puzzle</div>
              <div className="quick-action-sub">Rated for your level</div>
            </div>
          </Link>
        </div>

        {stats?.recentGames?.length > 0 && (
          <section className="home-recent">
            <h2>Recent games</h2>
            <div className="recent-games">
              {stats.recentGames.map((game) => {
                const isWhite = game.white_id === user.id;
                const myColor = isWhite ? 'White' : 'Black';
                const opponent = isWhite ? game.black_username : game.white_username;
                const opponentRating = isWhite ? game.black_rating : game.white_rating;
                const won = (isWhite && game.result === '1-0') || (!isWhite && game.result === '0-1');
                const drew = game.result === '1/2-1/2';
                return (
                  <div key={game.id} className="recent-game-row">
                    <div className="recent-game-result">
                      <span className={`badge ${won ? 'badge-green' : drew ? 'badge-yellow' : 'badge-red'}`}>
                        {won ? 'Win' : drew ? 'Draw' : 'Loss'}
                      </span>
                    </div>
                    <div className="recent-game-info">
                      <span>{myColor} vs {opponent} ({opponentRating})</span>
                      <span className="text-muted text-sm">{game.result_reason}</span>
                    </div>
                    <div className="text-muted text-sm">{game.time_control}s</div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
