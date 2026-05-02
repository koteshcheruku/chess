const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

async function getProfile(userId) {
  const { rows } = await query(
    `SELECT u.id, u.username, u.email, u.rating, u.is_guest, u.preferences, u.created_at,
            COUNT(DISTINCT g.id) FILTER (WHERE g.status = 'finished') AS games_played,
            COUNT(DISTINCT pa.id) AS puzzles_attempted,
            COUNT(DISTINCT pa.id) FILTER (WHERE pa.success = TRUE) AS puzzles_solved
     FROM users u
     LEFT JOIN games g ON (g.white_id = u.id OR g.black_id = u.id)
     LEFT JOIN puzzle_attempts pa ON pa.user_id = u.id
     WHERE u.id = $1
     GROUP BY u.id`,
    [userId]
  );
  if (rows.length === 0) throw Object.assign(new Error('User not found'), { status: 404 });
  const user = rows[0];
  // Never expose password_hash
  delete user.password_hash;
  return user;
}

async function getStats(userId) {
  // Games record
  const { rows: gamesRows } = await query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'finished') AS total,
       COUNT(*) FILTER (WHERE status = 'finished' AND (
         (white_id = $1 AND result = '1-0') OR (black_id = $1 AND result = '0-1')
       )) AS wins,
       COUNT(*) FILTER (WHERE status = 'finished' AND result = '1/2-1/2') AS draws,
       COUNT(*) FILTER (WHERE status = 'finished' AND (
         (white_id = $1 AND result = '0-1') OR (black_id = $1 AND result = '1-0')
       )) AS losses
     FROM games
     WHERE white_id = $1 OR black_id = $1`,
    [userId]
  );

  // Puzzle stats
  const { rows: puzzleRows } = await query(
    `SELECT
       COUNT(*) AS attempted,
       COUNT(*) FILTER (WHERE success = TRUE) AS solved,
       ROUND(AVG(time_taken)) AS avg_time
     FROM puzzle_attempts
     WHERE user_id = $1`,
    [userId]
  );

  // Recent games
  const { rows: recentGames } = await query(
    `SELECT g.id, g.time_control, g.result, g.result_reason,
            g.white_id, g.black_id,
            w.username AS white_username, b.username AS black_username,
            w.rating AS white_rating, b.rating AS black_rating,
            g.created_at
     FROM games g
     JOIN users w ON w.id = g.white_id
     JOIN users b ON b.id = g.black_id
     WHERE (g.white_id = $1 OR g.black_id = $1) AND g.status = 'finished'
     ORDER BY g.created_at DESC
     LIMIT 10`,
    [userId]
  );

  return {
    games: gamesRows[0],
    puzzles: puzzleRows[0],
    recentGames,
  };
}

async function updateSettings(userId, { username, preferences }) {
  if (username) {
    // Check uniqueness against other users
    const { rows } = await query(
      'SELECT id FROM users WHERE username = $1 AND id != $2',
      [username.toLowerCase(), userId]
    );
    if (rows.length > 0) throw Object.assign(new Error('Username already taken'), { status: 409 });
  }

  const updates = [];
  const params = [];
  let paramIdx = 1;

  if (username) {
    updates.push(`username = $${paramIdx++}`);
    params.push(username.toLowerCase());
  }
  if (preferences) {
    updates.push(`preferences = preferences || $${paramIdx++}::jsonb`);
    params.push(JSON.stringify(preferences));
  }
  updates.push(`updated_at = NOW()`);
  params.push(userId);

  if (updates.length === 1) return; // only updated_at, nothing to do

  const { rows } = await query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIdx}
     RETURNING id, username, email, rating, preferences`,
    params
  );
  return rows[0];
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (rows.length === 0) throw Object.assign(new Error('User not found'), { status: 404 });

  const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!valid) throw Object.assign(new Error('Current password is incorrect'), { status: 401 });

  const newHash = await bcrypt.hash(newPassword, 12);
  await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, userId]);
}

async function getActiveSessions(userId) {
  const { rows } = await query(
    'SELECT id, created_at, expires_at FROM sessions WHERE user_id = $1 AND expires_at > NOW() ORDER BY created_at DESC',
    [userId]
  );
  return rows;
}

async function updateRating(userId, newRating) {
  await query(
    'UPDATE users SET rating = $1, updated_at = NOW() WHERE id = $2',
    [newRating, userId]
  );
}

module.exports = { getProfile, getStats, updateSettings, changePassword, getActiveSessions, updateRating };
