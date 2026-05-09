const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { validate, submitPuzzleSchema } = require('../middleware/validate');
const { puzzleLimiter } = require('../middleware/rateLimit');
const { getRandomPuzzle, getPuzzle, submitPuzzle } = require('../services/puzzleService');

const VALID_DIFFICULTIES = ['easy', 'medium', 'hard', 'master'];

// GET /api/puzzle/random — get a puzzle matched to user rating
// Query params:
//   ?difficulty=easy|medium|hard|master (default: medium)
router.get('/random', requireAuth, puzzleLimiter, async (req, res, next) => {
  try {
    const difficulty = VALID_DIFFICULTIES.includes(req.query.difficulty)
      ? req.query.difficulty
      : 'medium';
    const puzzle = await getRandomPuzzle(req.user.id, req.user.rating || 1200, difficulty);
    res.json(puzzle);
  } catch (err) {
    next(err);
  }
});

// GET /api/puzzle/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const puzzle = await getPuzzle(req.params.id);
    res.json(puzzle);
  } catch (err) {
    next(err);
  }
});

// POST /api/puzzle/submit
router.post('/submit', requireAuth, validate(submitPuzzleSchema), async (req, res, next) => {
  try {
    const result = await submitPuzzle(req.user.id, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
