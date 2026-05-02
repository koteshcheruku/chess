const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');

const SALT_ROUNDS = 12;

function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
}

async function register({ username, email, password }) {
  // Check uniqueness
  const existing = await query(
    'SELECT id FROM users WHERE email = $1 OR username = $2',
    [email.toLowerCase(), username.toLowerCase()]
  );
  if (existing.rows.length > 0) {
    throw Object.assign(new Error('Email or username already taken'), { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const userId = uuidv4();

  const { rows } = await query(
    `INSERT INTO users (id, username, email, password_hash, rating, is_guest, preferences)
     VALUES ($1, $2, $3, $4, 1200, FALSE, '{}')
     RETURNING id, username, email, rating, is_guest, created_at`,
    [userId, username.toLowerCase(), email.toLowerCase(), passwordHash]
  );

  const user = rows[0];
  const accessToken = signAccessToken({ id: user.id, username: user.username, is_guest: false, rating: user.rating });
  const refreshToken = signRefreshToken({ id: user.id });

  // Store refresh token hash
  const tokenHash = await bcrypt.hash(refreshToken, 8);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await query(
    'INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)',
    [uuidv4(), user.id, tokenHash, expiresAt]
  );

  return { user, accessToken, refreshToken };
}

async function login({ email, password }) {
  const { rows } = await query(
    'SELECT id, username, email, password_hash, rating, is_guest FROM users WHERE email = $1 AND is_guest = FALSE',
    [email.toLowerCase()]
  );

  if (rows.length === 0) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  const user = rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  const accessToken = signAccessToken({ id: user.id, username: user.username, is_guest: false, rating: user.rating });
  const refreshToken = signRefreshToken({ id: user.id });

  const tokenHash = await bcrypt.hash(refreshToken, 8);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await query(
    'INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)',
    [uuidv4(), user.id, tokenHash, expiresAt]
  );

  const { password_hash: _, ...safeUser } = user;
  return { user: safeUser, accessToken, refreshToken };
}

async function createGuest() {
  const guestId = uuidv4();
  const guestName = `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  const { rows } = await query(
    `INSERT INTO users (id, username, rating, is_guest, guest_expires_at, preferences)
     VALUES ($1, $2, 1200, TRUE, $3, '{}')
     RETURNING id, username, rating, is_guest`,
    [guestId, guestName, expiresAt]
  );

  const user = rows[0];
  const accessToken = signAccessToken({ id: user.id, username: user.username, is_guest: true, rating: user.rating, exp: Math.floor(expiresAt.getTime() / 1000) });

  return { user, accessToken };
}

async function refreshTokens(rawRefreshToken) {
  let payload;
  try {
    payload = jwt.verify(rawRefreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
  }

  // Find active sessions for this user
  const { rows: sessions } = await query(
    'SELECT id, token_hash FROM sessions WHERE user_id = $1 AND expires_at > NOW()',
    [payload.id]
  );

  let matchedSession = null;
  for (const session of sessions) {
    const match = await bcrypt.compare(rawRefreshToken, session.token_hash);
    if (match) { matchedSession = session; break; }
  }

  if (!matchedSession) {
    throw Object.assign(new Error('Refresh token not found or expired'), { status: 401 });
  }

  // Get user
  const { rows } = await query(
    'SELECT id, username, rating, is_guest FROM users WHERE id = $1',
    [payload.id]
  );
  if (rows.length === 0) throw Object.assign(new Error('User not found'), { status: 404 });
  const user = rows[0];

  // Rotate tokens
  await query('DELETE FROM sessions WHERE id = $1', [matchedSession.id]);

  const newAccessToken = signAccessToken({ id: user.id, username: user.username, is_guest: user.is_guest, rating: user.rating });
  const newRefreshToken = signRefreshToken({ id: user.id });

  const tokenHash = await bcrypt.hash(newRefreshToken, 8);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await query(
    'INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)',
    [uuidv4(), user.id, tokenHash, expiresAt]
  );

  return { accessToken: newAccessToken, refreshToken: newRefreshToken, user };
}

async function logout(userId, rawRefreshToken) {
  if (!rawRefreshToken) {
    // Logout all sessions
    await query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    return;
  }
  const { rows: sessions } = await query(
    'SELECT id, token_hash FROM sessions WHERE user_id = $1 AND expires_at > NOW()',
    [userId]
  );
  for (const session of sessions) {
    const match = await bcrypt.compare(rawRefreshToken, session.token_hash);
    if (match) {
      await query('DELETE FROM sessions WHERE id = $1', [session.id]);
      return;
    }
  }
}

async function logoutAll(userId) {
  await query('DELETE FROM sessions WHERE user_id = $1', [userId]);
}

module.exports = { register, login, createGuest, refreshTokens, logout, logoutAll };
