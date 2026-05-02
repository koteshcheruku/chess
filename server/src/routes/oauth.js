const express = require('express');
const passport = require('passport');
const router = express.Router();
const { issueJwtForUser } = require('../config/passport');

const isOAuthEnabled = () =>
  !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

// GET /api/auth/google
// Redirect user to Google consent screen
router.get('/google', (req, res, next) => {
  if (!isOAuthEnabled()) {
    return res.status(503).json({ error: 'Google OAuth is not configured on this server yet.' });
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

// GET /api/auth/google/callback
// Google redirects here after user consents
router.get(
  '/google/callback',
  (req, res, next) => {
    if (!isOAuthEnabled()) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_disabled`);
    }
    passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth_failed` })(req, res, next);
  },
  (req, res) => {
    // Issue JWT and redirect to frontend with token in query
    const accessToken = issueJwtForUser(req.user);
    const user = encodeURIComponent(JSON.stringify({
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      rating: req.user.rating,
      is_guest: false,
    }));
    // Redirect to frontend – client reads token from URL params
    res.redirect(`${process.env.CLIENT_URL}/oauth-callback?token=${accessToken}&user=${user}`);
  }
);

// GET /api/auth/google/status — tells the client whether OAuth is available
router.get('/google/status', (req, res) => {
  res.json({ enabled: isOAuthEnabled() });
});

module.exports = router;
