const { v4: uuidv4 } = require('uuid');
const { Chess } = require('chess.js');
const { query } = require('../config/db');
const { calculateElo } = require('./eloService');
const { updateRating } = require('./userService');

const TIME_CONTROLS = {
  '60': 60,
  '180': 180,
  '300': 300,
  '600': 600,
  '900': 900,
};

async function createGame({ whiteId, blackId, timeControl, increment = 0, isBotGame = false, botElo = null }) {
  const seconds = TIME_CONTROLS[timeControl] || 300;
  const gameId = uuidv4();

  const { rows } = await query(
    `INSERT INTO games
       (id, white_id, black_id, time_control, increment, status, is_bot_game, bot_elo,
        white_rating_before, black_rating_before)
     VALUES ($1, $2, $3::VARCHAR, $4, $5,
       'waiting',
       $6, $7,
       (SELECT rating FROM users WHERE id = $2),
       (SELECT rating FROM users WHERE id = $3::VARCHAR)
     )
     RETURNING *`,
    [gameId, whiteId, blackId, timeControl, increment, isBotGame, botElo]
  );

  return rows[0];
}

async function getGame(gameId) {
  const { rows } = await query(
    `SELECT g.*,
            w.username AS white_username, w.rating AS white_rating,
            b.username AS black_username, b.rating AS black_rating
     FROM games g
     JOIN users w ON w.id = g.white_id
     LEFT JOIN users b ON b.id = g.black_id
     WHERE g.id = $1`,
    [gameId]
  );
  if (rows.length === 0) throw Object.assign(new Error('Game not found'), { status: 404 });
  return rows[0];
}

async function recordMove(gameId, move) {
  await query(
    `UPDATE games
     SET moves = moves || $2::jsonb,
         final_fen = $3,
         status = CASE WHEN $4 THEN 'finished' ELSE 'active' END,
         updated_at = NOW()
     WHERE id = $1`,
    [gameId, JSON.stringify(move), move.fen, move.isGameOver]
  );
}

async function finishGame(gameId, result, resultReason) {
  // Get game with player ratings
  const game = await getGame(gameId);
  const whiteRating = game.white_rating_before || 1200;
  const blackRating = game.black_rating_before || 1200;

  const { newRatingA: newWhiteRating, newRatingB: newBlackRating, deltaA, deltaB } =
    calculateElo(whiteRating, blackRating, result);

  await query(
    `UPDATE games
     SET status = 'finished',
         result = $2,
         result_reason = $3,
         white_rating_after = $4,
         black_rating_after = $5,
         updated_at = NOW()
     WHERE id = $1`,
    [gameId, result, resultReason, newWhiteRating, newBlackRating]
  );

  // Update user ratings (only for registered non-guest users)
  const { rows: white } = await query('SELECT is_guest FROM users WHERE id = $1', [game.white_id]);
  const { rows: black } = await query('SELECT is_guest FROM users WHERE id = $1', [game.black_id]);

  if (white[0] && !white[0].is_guest) await updateRating(game.white_id, newWhiteRating);
  if (black[0] && !black[0].is_guest) await updateRating(game.black_id, newBlackRating);

  return { deltaA, deltaB, newWhiteRating, newBlackRating };
}

async function abortGame(gameId) {
  await query(
    `UPDATE games SET status = 'aborted', result = 'aborted', updated_at = NOW() WHERE id = $1`,
    [gameId]
  );
}

module.exports = { createGame, getGame, recordMove, finishGame, abortGame };
