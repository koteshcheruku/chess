import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import './Page.css';

export default function ProfilePage() {
  const { id } = useParams();
  const { user: me } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/user/${id}`),
      api.get(`/user/${id}/stats`),
    ])
      .then(([p, s]) => { setProfile(p.data); setStats(s.data); })
      .catch(() => setError('Could not load profile.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <main className="page"><div className="full-center"><div className="spinner spinner-lg" /></div></main>;
  if (error) return <main className="page"><div className="alert alert-error">{error}</div></main>;
  if (!profile) return null;

  const winRate = stats?.games?.total > 0
    ? Math.round((stats.games.wins / stats.games.total) * 100)
    : null;

  const isOwnProfile = me?.id === profile.id;

  return (
    <main className="page">
      <div className="profile-header">
        <div className="profile-avatar">
          {profile.username?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="profile-info">
          <h1>{profile.username}</h1>
          <p style={{ margintop: 4 }}>
            Member since {new Date(profile.created_at).toLocaleDateString()}
            {profile.is_guest && <span className="badge badge-yellow" style={{ marginLeft: 8 }}>Guest</span>}
          </p>
          {isOwnProfile && <Link to="/settings" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}>Edit settings</Link>}
        </div>
      </div>

      <div className="profile-stats">
        <div className="stat-tile">
          <div className="stat-value">{profile.rating ?? 1200}</div>
          <div className="stat-label">Rating</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value">{stats?.games?.total ?? 0}</div>
          <div className="stat-label">Games played</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value">{winRate !== null ? `${winRate}%` : '—'}</div>
          <div className="stat-label">Win rate</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value">{stats?.puzzles?.solved ?? 0}</div>
          <div className="stat-label">Puzzles solved</div>
        </div>
      </div>

      {stats?.games && (
        <div className="card mb-4" style={{ marginBottom: 'var(--space-6)' }}>
          <h3 style={{ marginBottom: 'var(--space-4)' }}>Game record</h3>
          <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent)' }}>{stats.games.wins ?? 0}</div>
              <div className="text-muted text-sm">Wins</div>
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--warning)' }}>{stats.games.draws ?? 0}</div>
              <div className="text-muted text-sm">Draws</div>
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--error)' }}>{stats.games.losses ?? 0}</div>
              <div className="text-muted text-sm">Losses</div>
            </div>
          </div>
        </div>
      )}

      {stats?.recentGames?.length > 0 && (
        <section>
          <h2 style={{ marginBottom: 'var(--space-4)' }}>Recent games</h2>
          <div className="recent-games">
            {stats.recentGames.map((game) => {
              const asWhite = game.white_id === profile.id;
              const won = (asWhite && game.result === '1-0') || (!asWhite && game.result === '0-1');
              const drew = game.result === '1/2-1/2';
              const opponent = asWhite ? game.black_username : game.white_username;
              const oppRating = asWhite ? game.black_rating : game.white_rating;
              return (
                <div key={game.id} className="recent-game-row">
                  <span className={`badge ${won ? 'badge-green' : drew ? 'badge-yellow' : 'badge-red'}`}>
                    {won ? 'Win' : drew ? 'Draw' : 'Loss'}
                  </span>
                  <div className="recent-game-info">
                    <span>vs {opponent} ({oppRating}) — {asWhite ? 'White' : 'Black'}</span>
                    <span className="text-muted text-sm">{game.result_reason} · {game.time_control}s</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
