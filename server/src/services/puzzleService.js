const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { calculatePuzzleElo } = require('./eloService');

/**
 * Difficulty presets — offset ranges applied to the user's current rating.
 * Each difficulty widens or shifts the rating band differently.
 */
const DIFFICULTY_RANGES = {
  easy:   { minOffset: -400, maxOffset: -100 },
  medium: { minOffset: -250, maxOffset:  250 },
  hard:   { minOffset:  100, maxOffset:  500 },
  master: { minOffset:  400, maxOffset: 1000 },
};

/**
 * Fetch a puzzle from the Lichess Open API and cache it in our DB.
 * Lichess /api/puzzle/next returns a random puzzle (no auth needed).
 * When LICHESS_TOKEN is set, we send it for better rate limits.
 */
async function fetchAndCacheFromLichess(userRating) {
  try {
    const https = require('https');
    const url = 'https://lichess.org/api/puzzle/next';

    const headers = {
      'Accept': 'application/json',
      'User-Agent': 'ChessTrainingApp/1.0',
    };

    // Use Lichess token if available for better rate limits
    if (process.env.LICHESS_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.LICHESS_TOKEN}`;
    }

    const lichessPuzzle = await new Promise((resolve, reject) => {
      const req = https.get(url, {
        headers,
        timeout: 5000,
      }, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(body)); }
          catch { reject(new Error('Bad JSON from Lichess')); }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Lichess timeout')); });
    });

    if (!lichessPuzzle?.puzzle?.id || !lichessPuzzle?.game?.pgn) return null;

    const p = lichessPuzzle.puzzle;
    // Lichess returns moves in UCI already in puzzle.solution
    const moves = p.solution || [];
    if (moves.length === 0) return null;

    const lichessId = `lichess_${p.id}`;
    const fen = p.initialFen || lichessPuzzle.game?.initialFen;
    if (!fen) return null;

    const rating = p.rating || 1200;
    const themes = p.themes || [];

    // Check if already cached
    const { rows: existing } = await query('SELECT * FROM puzzles WHERE lichess_id = $1', [lichessId]);
    if (existing.length > 0) return existing[0];

    // Insert into DB
    const id = uuidv4();
    await query(
      `INSERT INTO puzzles (id, lichess_id, fen, moves, rating, themes)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (lichess_id) DO NOTHING`,
      [id, lichessId, fen, moves, rating, themes]
    );

    const { rows } = await query('SELECT * FROM puzzles WHERE lichess_id = $1', [lichessId]);
    return rows[0] || null;
  } catch (err) {
    console.warn('[PuzzleService] Lichess fallback failed:', err.message);
    return null;
  }
}

/**
 * Get a random puzzle near the user's rating, filtered by difficulty.
 * Priority:
 *   1. Unsolved puzzles in rating range (local DB)
 *   2. Any puzzle in rating range (local DB)
 *   3. Live fetch from Lichess API (cached for next time)
 *   4. Any puzzle in DB (last resort)
 *
 * @param {string} userId
 * @param {number} userRating
 * @param {string} difficulty - one of: easy, medium, hard, master
 */
async function getRandomPuzzle(userId, userRating, difficulty = 'medium') {
  const range = DIFFICULTY_RANGES[difficulty] || DIFFICULTY_RANGES.medium;
  const ratingMin = Math.max(100, userRating + range.minOffset);
  const ratingMax = userRating + range.maxOffset;

  console.log(`[PuzzleService] Fetching puzzle: user=${userRating}, difficulty=${difficulty}, range=${ratingMin}-${ratingMax}`);

  // 1. Prefer unsolved puzzles first
  const { rows } = await query(
    `SELECT p.*
     FROM puzzles p
     WHERE p.rating BETWEEN $1 AND $2
       AND NOT EXISTS (
         SELECT 1 FROM puzzle_attempts pa
         WHERE pa.puzzle_id = p.id AND pa.user_id = $3 AND pa.success = TRUE
       )
     ORDER BY RANDOM()
     LIMIT 1`,
    [ratingMin, ratingMax, userId]
  );
  if (rows.length > 0) return rows[0];

  // 2. Any puzzle in range (even already solved)
  const { rows: inRange } = await query(
    `SELECT * FROM puzzles WHERE rating BETWEEN $1 AND $2 ORDER BY RANDOM() LIMIT 1`,
    [ratingMin, ratingMax]
  );
  if (inRange.length > 0) return inRange[0];

  // 3. Fetch live from Lichess and cache
  console.log('[PuzzleService] No local puzzles in range, fetching from Lichess...');
  const livePuzzle = await fetchAndCacheFromLichess(userRating);
  if (livePuzzle) return livePuzzle;

  // 4. Last resort: any puzzle
  const { rows: any } = await query(`SELECT * FROM puzzles ORDER BY RANDOM() LIMIT 1`, []);
  if (any.length === 0) {
    throw Object.assign(new Error('No puzzles available. Run: node src/db/seed.js'), { status: 404 });
  }
  return any[0];
}

async function getPuzzle(puzzleId) {
  const { rows } = await query('SELECT * FROM puzzles WHERE id = $1', [puzzleId]);
  if (rows.length === 0) throw Object.assign(new Error('Puzzle not found'), { status: 404 });
  return rows[0];
}

/**
 * Submit a puzzle attempt.
 * Compares submitted moves against stored solution.
 * Returns { success, delta, newRating, correctMoves }.
 */
async function submitPuzzle(userId, { puzzleId, moves, timeTaken }) {
  const puzzle = await getPuzzle(puzzleId);

  // Get current user rating
  const { rows: userRows } = await query('SELECT rating, is_guest FROM users WHERE id = $1', [userId]);
  if (userRows.length === 0) throw Object.assign(new Error('User not found'), { status: 404 });
  const user = userRows[0];

  // Normalize moves
  const normalize = (m) => m.toLowerCase().trim();
  const submitted = moves.map(normalize);
  const solution  = puzzle.moves.map(normalize);

  // Only player moves count — in multi-move puzzles the solution alternates
  // player, opponent, player, opponent... so we only compare player moves
  // (odd indices: 0, 2, 4, ...) unless it's a single-move puzzle.
  let success = false;
  if (solution.length === 1) {
    success = submitted.length >= 1 && submitted[0] === solution[0];
  } else {
    // For multi-move puzzles, submitted contains only the player's moves
    // and the solution contains interleaved player+opponent moves.
    // Extract player moves from solution (indices 0, 2, 4, ...)
    const playerSolutionMoves = solution.filter((_, i) => i % 2 === 0);
    success = submitted.length === playerSolutionMoves.length &&
      playerSolutionMoves.every((m, i) => submitted[i] === m);
  }

  const { delta, newRating } = calculatePuzzleElo(user.rating, puzzle.rating, success);

  // Record attempt
  await query(
    `INSERT INTO puzzle_attempts (id, user_id, puzzle_id, success, time_taken, rating_before, rating_after)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [uuidv4(), userId, puzzleId, success, timeTaken, user.rating, newRating]
  );

  // Update user rating (only for registered users)
  if (!user.is_guest) {
    await query('UPDATE users SET rating = $1, updated_at = NOW() WHERE id = $2', [newRating, userId]);
  }

  // Always return the full solution so the client can show the answer on failure
  return { success, delta, newRating, correctMoves: solution };
}

/**
 * Skip a puzzle — records a skipped attempt so it won't be served again immediately,
 * but does NOT modify the user's rating.
 */
async function skipPuzzle(userId, puzzleId) {
  const { rows: userRows } = await query('SELECT rating FROM users WHERE id = $1', [userId]);
  if (userRows.length === 0) throw Object.assign(new Error('User not found'), { status: 404 });
  const { rating } = userRows[0];

  await query(
    `INSERT INTO puzzle_attempts (id, user_id, puzzle_id, success, time_taken, rating_before, rating_after)
     VALUES ($1, $2, $3, FALSE, 0, $4, $4)`,
    [uuidv4(), userId, puzzleId, rating]
  );
}

module.exports = { getRandomPuzzle, getPuzzle, submitPuzzle, skipPuzzle };
