const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { validate, createGameSchema } = require('../middleware/validate');
const { v4: uuidv4 } = require('uuid');
const { createGame, getGame } = require('../services/gameService');
const { query } = require('../config/db');

const VALID_BOT_ELOS = [300, 500, 800, 1000, 1200, 1500];

// POST /api/game/create
router.post('/create', requireAuth, validate(createGameSchema), async (req, res, next) => {
  try {
    const { timeControl, increment, vsBot, botElo, color } = req.body;
    const userId = req.user.id;

    if (vsBot) {
      if (!botElo || !VALID_BOT_ELOS.includes(botElo)) {
        return res.status(400).json({ error: `botElo must be one of: ${VALID_BOT_ELOS.join(', ')}` });
      }

      // Use a stable, valid-UUID-format bot ID (deterministic per ELO)
      const botUserIds = {
        300:  '00000000-0000-0000-0000-000000000300',
        500:  '00000000-0000-0000-0000-000000000500',
        800:  '00000000-0000-0000-0000-000000000800',
        1000: '00000000-0000-0000-0000-000000001000',
        1200: '00000000-0000-0000-0000-000000001200',
        1500: '00000000-0000-0000-0000-000000001500',
      };
      const botUserId = botUserIds[botElo];

      // Ensure bot user exists (upsert)
      await query(
        `INSERT INTO users (id, username, rating, is_guest)
         VALUES ($1, $2, $3, FALSE)
         ON CONFLICT (id) DO UPDATE SET rating = $3`,
        [botUserId, `Bot ${botElo}`, botElo]
      );

      let whiteId, blackId;
      const resolvedColor = color === 'random' ? (Math.random() > 0.5 ? 'white' : 'black') : color;
      if (resolvedColor === 'white') { whiteId = userId; blackId = botUserId; }
      else { whiteId = botUserId; blackId = userId; }

      const game = await createGame({ whiteId, blackId, timeControl, increment, isBotGame: true, botElo });
      return res.status(201).json({ game, playerColor: resolvedColor });
    }

    // Human matchmaking: look for an open game
    const { rows: available } = await query(
      `SELECT id FROM games
       WHERE status = 'waiting' AND time_control = $1 AND is_bot_game = FALSE
         AND white_id != $2 AND black_id IS NULL
       ORDER BY created_at ASC LIMIT 1`,
      [timeControl, userId]
    );

    if (available.length > 0) {
      const gameId = available[0].id;
      const resolvedColor = 'black';
      await query(
        `UPDATE games SET black_id = $1, status = 'active',
                          black_rating_before = (SELECT rating FROM users WHERE id = $1),
                          updated_at = NOW()
         WHERE id = $2`,
        [userId, gameId]
      );
      const game = await getGame(gameId);
      return res.status(200).json({ game, playerColor: resolvedColor });
    }

    // No open game: create one as white
    const botPlaceholder = uuidv4(); // placeholder until opponent joins
    const game = await createGame({ whiteId: userId, blackId: null, timeControl, increment });
    return res.status(201).json({ game, playerColor: 'white', waiting: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/game/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const game = await getGame(req.params.id);
    res.json(game);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
