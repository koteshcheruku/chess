const express = require('express');
const router = express.Router();
const { requireAuth, requireRegistered } = require('../middleware/auth');
const { validate, updateSettingsSchema, changePasswordSchema } = require('../middleware/validate');
const userService = require('../services/userService');
const authService = require('../services/authService');

// GET /api/user/me
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await userService.getProfile(req.user.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// GET /api/user/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const user = await userService.getProfile(req.params.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// GET /api/user/:id/stats
router.get('/:id/stats', requireAuth, async (req, res, next) => {
  try {
    const stats = await userService.getStats(req.params.id);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

// PUT /api/user/settings
router.put('/settings', requireAuth, requireRegistered, validate(updateSettingsSchema), async (req, res, next) => {
  try {
    const updated = await userService.updateSettings(req.user.id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// PUT /api/user/password
router.put('/password', requireAuth, requireRegistered, validate(changePasswordSchema), async (req, res, next) => {
  try {
    await userService.changePassword(req.user.id, req.body);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
});

// GET /api/user/sessions — view active sessions
router.get('/sessions', requireAuth, requireRegistered, async (req, res, next) => {
  try {
    const sessions = await userService.getActiveSessions(req.user.id);
    res.json(sessions);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
