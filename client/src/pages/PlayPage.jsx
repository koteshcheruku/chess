import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import api from '../services/api';
import './Page.css';

const TIME_OPTIONS = [
  { value: '60',  label: '1 min',  sub: 'Bullet' },
  { value: '180', label: '3 min',  sub: 'Blitz' },
  { value: '300', label: '5 min',  sub: 'Blitz' },
  { value: '600', label: '10 min', sub: 'Rapid' },
  { value: '900', label: '15 min', sub: 'Rapid' },
];

const BOT_LEVELS = [
  { elo: 300,  label: 'Beginner' },
  { elo: 500,  label: 'Casual' },
  { elo: 800,  label: 'Intermediate' },
  { elo: 1000, label: 'Club player' },
  { elo: 1200, label: 'Advanced' },
  { elo: 1500, label: 'Expert' },
];

const COLORS = [
  { value: 'random', label: 'Random' },
  { value: 'white',  label: 'White' },
  { value: 'black',  label: 'Black' },
];

export default function PlayPage() {
  const { user } = useAuthStore();
  const { defaultTimeControl } = useSettingsStore();
  const navigate = useNavigate();

  const [vsBot, setVsBot] = useState(false);
  const [timeControl, setTimeControl] = useState(defaultTimeControl || '300');
  const [botElo, setBotElo] = useState(800);
  const [color, setColor] = useState('random');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePlay = async () => {
    setError('');
    setLoading(true);
    try {
      const payload = { timeControl, increment: 0, vsBot, color };
      if (vsBot) payload.botElo = botElo;
      const { data } = await api.post('/game/create', payload);
      navigate(`/game/${data.game.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create game.');
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <div className="play-page">
        <h1>New game</h1>
        <p className="mt-2 mb-4">Choose a time control and opponent.</p>

        {error && <div className="alert alert-error mb-4">{error}</div>}

        {/* Opponent type */}
        <div className="mb-4">
          <p className="section-title">Opponent</p>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <button
              id="vs-human"
              className={`btn ${!vsBot ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setVsBot(false)}
            >
              vs Human
            </button>
            <button
              id="vs-bot"
              className={`btn ${vsBot ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setVsBot(true)}
            >
              vs Bot
            </button>
          </div>
        </div>

        {/* Bot ELO */}
        {vsBot && (
          <div className="mb-4">
            <p className="section-title">Bot level</p>
            <div className="bot-options">
              {BOT_LEVELS.map((b) => (
                <button
                  key={b.elo}
                  id={`bot-${b.elo}`}
                  className={`bot-option ${botElo === b.elo ? 'selected' : ''}`}
                  onClick={() => setBotElo(b.elo)}
                >
                  <div className="bot-elo">{b.elo}</div>
                  <div className="bot-label">{b.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Time control */}
        <div className="mb-4">
          <p className="section-title">Time control</p>
          <div className="time-options">
            {TIME_OPTIONS.map((t) => (
              <button
                key={t.value}
                id={`time-${t.value}`}
                className={`time-option ${timeControl === t.value ? 'selected' : ''}`}
                onClick={() => setTimeControl(t.value)}
              >
                <div className="time-label">{t.label}</div>
                <div className="time-sub">{t.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Color - only for bot or when creating a new game */}
        {vsBot && (
          <div className="mb-4">
            <p className="section-title">Play as</p>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  id={`color-${c.value}`}
                  className={`btn ${color === c.value ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setColor(c.value)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          id="start-game"
          className="btn btn-primary btn-lg"
          onClick={handlePlay}
          disabled={loading}
        >
          {loading ? 'Finding game...' : 'Start game'}
        </button>
      </div>
    </main>
  );
}
