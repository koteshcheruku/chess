const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { validate, submitPuzzleSchema } = require('../middleware/validate');
const { puzzleLimiter } = require('../middleware/rateLimit');
const { getRandomPuzzle, getPuzzle, submitPuzzle } = require('../services/puzzleService');

// GET /api/puzzle/random — get a puzzle matched to user rating
router.get('/random', requireAuth, puzzleLimiter, async (req, res, next) => {
  try {
    const puzzle = await getRandomPuzzle(req.user.id, req.user.rating || 1200);
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
