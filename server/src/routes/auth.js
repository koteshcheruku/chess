const express = require('express');
const router = express.Router();
const { validate, registerSchema, loginSchema } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimit');
const { requireAuth } = require('../middleware/auth');
const authService = require('../services/authService');

// POST /api/auth/register
router.post('/register', authLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = await authService.register(req.body);
    res.status(201).json({ user, accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = await authService.login(req.body);
    res.json({ user, accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/guest — no body required
router.post('/guest', authLimiter, async (req, res, next) => {
  try {
    const { user, accessToken } = await authService.createGuest();
    res.status(201).json({ user, accessToken });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
  try {
    const tokens = await authService.refreshTokens(refreshToken);
    res.json(tokens);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req, res, next) => {
  const { refreshToken } = req.body;
  try {
    await authService.logout(req.user.id, refreshToken);
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout-all
router.post('/logout-all', requireAuth, async (req, res, next) => {
  try {
    await authService.logoutAll(req.user.id);
    res.json({ message: 'All sessions terminated' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
