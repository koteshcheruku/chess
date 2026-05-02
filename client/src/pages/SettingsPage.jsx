import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore, BOARD_THEMES } from '../store/settingsStore';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import './Page.css';

const TABS = ['Account', 'Appearance', 'Gameplay', 'Security'];

function Toggle({ id, checked, onChange }) {
  return (
    <label className="toggle" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, isGuest, logout, updateUser } = useAuth();
  const {
    boardTheme, sound, animations, defaultTimeControl, boardOrientation,
    setBoardTheme, setSound, setAnimations, setDefaultTimeControl, setBoardOrientation,
  } = useSettingsStore();

  const [activeTab, setActiveTab] = useState('Account');
  const [username, setUsername] = useState(user?.username ?? '');
  const [usernameMsg, setUsernameMsg] = useState('');
  const [usernameError, setUsernameError] = useState('');

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    if (activeTab === 'Security' && !isGuest()) {
      api.get('/user/sessions').then(({ data }) => setSessions(data)).catch(() => {});
    }
  }, [activeTab]);

  const saveUsername = async () => {
    setUsernameMsg('');
    setUsernameError('');
    if (username.trim() === user?.username) { setUsernameMsg('No change.'); return; }
    try {
      const { data } = await api.put('/user/settings', { username: username.trim() });
      updateUser({ username: data.username });
      setUsernameMsg('Username updated.');
    } catch (err) {
      setUsernameError(err.response?.data?.error || 'Failed to update username.');
    }
  };

  const savePassword = async () => {
    setPwError('');
    setPwSuccess('');
    if (pwForm.next !== pwForm.confirm) { setPwError('Passwords do not match.'); return; }
    if (pwForm.next.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    try {
      await api.put('/user/password', { currentPassword: pwForm.current, newPassword: pwForm.next });
      setPwSuccess('Password updated.');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setPwError(err.response?.data?.error || 'Failed to update password.');
    }
  };

  const logoutAll = async () => {
    if (!window.confirm('Log out from all devices?')) return;
    await api.post('/auth/logout-all').catch(() => {});
    logout();
  };

  const saveGameplayPrefs = async () => {
    try {
      await api.put('/user/settings', {
        preferences: { defaultTimeControl, boardOrientation },
      });
    } catch { /* silent — local store already updated */ }
  };

  return (
    <main className="page">
      <h1 style={{ marginBottom: 'var(--space-6)' }}>Settings</h1>

      <div className="settings-layout">
        {/* Nav */}
        <nav className="settings-nav">
          {TABS.map((tab) => (
            <button
              key={tab}
              id={`tab-${tab.toLowerCase()}`}
              className={`settings-nav-item ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>

        {/* Sections */}
        <div className="card">
          {/* ACCOUNT */}
          {activeTab === 'Account' && (
            <div className="settings-section">
              <h2>Account</h2>
              {isGuest() && (
                <div className="alert alert-info">
                  Guest accounts cannot change username or password.{' '}
                  <a href="/register">Create a free account</a> to unlock all features.
                </div>
              )}
              {!isGuest() && (
                <>
                  <div className="form-group">
                    <label className="form-label" htmlFor="settings-username">Username</label>
                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                      <input
                        id="settings-username"
                        type="text"
                        className="form-input"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button id="save-username" className="btn btn-secondary" onClick={saveUsername}>Save</button>
                    </div>
                    {usernameMsg && <span className="form-hint text-accent">{usernameMsg}</span>}
                    {usernameError && <span className="form-error">{usernameError}</span>}
                  </div>

                  <hr className="divider" />

                  <div>
                    <h3 style={{ marginBottom: 'var(--space-4)' }}>Email</h3>
                    <p className="text-muted text-sm">{user?.email ?? '—'}</p>
                  </div>
                </>
              )}

              <hr className="divider" />

              <div>
                <button id="logout-btn" className="btn btn-danger btn-sm" onClick={logout}>
                  Log out
                </button>
              </div>
            </div>
          )}

          {/* APPEARANCE */}
          {activeTab === 'Appearance' && (
            <div className="settings-section">
              <h2>Appearance</h2>

              <div>
                <p className="section-title" style={{ marginBottom: 'var(--space-4)' }}>Board Theme</p>
                <div className="theme-grid">
                  {BOARD_THEMES.map((t) => (
                    <button
                      key={t.id}
                      id={`theme-${t.id}`}
                      className={`theme-card ${boardTheme === t.id ? 'active' : ''}`}
                      onClick={() => setBoardTheme(t.id)}
                      title={t.name}
                    >
                      {/* Mini board preview */}
                      <div className="theme-preview" style={{ background: t.bg }}>
                        <div className="theme-preview-board">
                          {[0,1,2,3].map((row) =>
                            [0,1,2,3].map((col) => (
                              <div
                                key={`${row}-${col}`}
                                style={{
                                  background: (row + col) % 2 === 0 ? t.sqLight : t.sqDark,
                                }}
                              />
                            ))
                          )}
                        </div>
                        <div
                          className="theme-accent-dot"
                          style={{ background: t.accent }}
                        />
                      </div>
                      <span className="theme-name">{t.name}</span>
                      {boardTheme === t.id && (
                        <span className="theme-check">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <hr className="divider" />

              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Move animations</div>
                  <div className="settings-row-desc">Animate piece movement on the board</div>
                </div>
                <Toggle id="toggle-animations" checked={animations} onChange={setAnimations} />
              </div>
            </div>
          )}

          {/* GAMEPLAY */}
          {activeTab === 'Gameplay' && (
            <div className="settings-section">
              <h2>Gameplay</h2>

              <div className="form-group">
                <label className="form-label" htmlFor="default-time">Default time control</label>
                <select
                  id="default-time"
                  className="form-input"
                  value={defaultTimeControl}
                  onChange={(e) => setDefaultTimeControl(e.target.value)}
                  style={{ maxWidth: 200 }}
                >
                  <option value="60">1 min (Bullet)</option>
                  <option value="180">3 min (Blitz)</option>
                  <option value="300">5 min (Blitz)</option>
                  <option value="600">10 min (Rapid)</option>
                  <option value="900">15 min (Rapid)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="board-orientation">Board orientation</label>
                <select
                  id="board-orientation"
                  className="form-input"
                  value={boardOrientation}
                  onChange={(e) => setBoardOrientation(e.target.value)}
                  style={{ maxWidth: 200 }}
                >
                  <option value="white">White (bottom)</option>
                  <option value="black">Black (bottom)</option>
                </select>
              </div>

              <hr className="divider" />

              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Sound effects</div>
                  <div className="settings-row-desc">Play sounds on move and capture</div>
                </div>
                <Toggle id="toggle-sound" checked={sound} onChange={setSound} />
              </div>

              {!isGuest() && (
                <button id="save-gameplay" className="btn btn-primary btn-sm" onClick={saveGameplayPrefs}>
                  Save preferences
                </button>
              )}
            </div>
          )}

          {/* SECURITY */}
          {activeTab === 'Security' && (
            <div className="settings-section">
              <h2>Security</h2>

              {isGuest() ? (
                <p className="text-muted">Security settings are not available for guest accounts.</p>
              ) : (
                <>
                  <div>
                    <h3 style={{ marginBottom: 'var(--space-4)' }}>Change password</h3>
                    <div className="auth-form" style={{ maxWidth: 360 }}>
                      {pwError && <div className="alert alert-error">{pwError}</div>}
                      {pwSuccess && <div className="alert alert-success">{pwSuccess}</div>}
                      <div className="form-group">
                        <label className="form-label" htmlFor="pw-current">Current password</label>
                        <input
                          id="pw-current"
                          type="password"
                          className="form-input"
                          value={pwForm.current}
                          onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                          autoComplete="current-password"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="pw-new">New password</label>
                        <input
                          id="pw-new"
                          type="password"
                          className="form-input"
                          placeholder="Min 8 characters"
                          value={pwForm.next}
                          onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
                          autoComplete="new-password"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="pw-confirm">Confirm new password</label>
                        <input
                          id="pw-confirm"
                          type="password"
                          className="form-input"
                          value={pwForm.confirm}
                          onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                        />
                      </div>
                      <button id="save-password" className="btn btn-primary btn-sm" onClick={savePassword}>
                        Update password
                      </button>
                    </div>
                  </div>

                  <hr className="divider" />

                  <div>
                    <h3 style={{ marginBottom: 'var(--space-2)' }}>Active sessions</h3>
                    <p className="text-muted text-sm mb-4">{sessions.length} active session{sessions.length !== 1 ? 's' : ''}</p>
                    <button id="logout-all-btn" className="btn btn-danger btn-sm" onClick={logoutAll}>
                      Log out all devices
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
