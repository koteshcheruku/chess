const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const { query } = require('./db');

/**
 * Configure Google OAuth strategy.
 * Only registered when GOOGLE_CLIENT_ID is set in env.
 */
function configurePassport() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.log('[OAuth] Google OAuth disabled — GOOGLE_CLIENT_ID not set.');
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) return done(new Error('No email from Google'), null);

          // Check if user exists by email
          const { rows } = await query(
            'SELECT id, username, email, rating, is_guest FROM users WHERE email = $1 AND is_guest = FALSE',
            [email]
          );

          let user;
          if (rows.length > 0) {
            user = rows[0];
          } else {
            // Create new user from Google profile
            const userId = uuidv4();
            // Generate a unique username from display name
            const baseUsername = (profile.displayName || email.split('@')[0])
              .toLowerCase()
              .replace(/[^a-z0-9_]/g, '_')
              .slice(0, 28);
            const username = `${baseUsername}_${Math.floor(Math.random() * 100)}`;

            const { rows: created } = await query(
              `INSERT INTO users (id, username, email, rating, is_guest, preferences)
               VALUES ($1, $2, $3, 1200, FALSE, '{}')
               RETURNING id, username, email, rating, is_guest`,
              [userId, username, email]
            );
            user = created[0];
          }

          done(null, user);
        } catch (err) {
          done(err, null);
        }
      }
    )
  );

  // Minimal session serialization
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const { rows } = await query('SELECT id, username, email, rating, is_guest FROM users WHERE id = $1', [id]);
      done(null, rows[0] || null);
    } catch (err) {
      done(err);
    }
  });

  console.log('[OAuth] Google OAuth configured.');
}

/**
 * Generate a JWT access token for a user after OAuth success.
 */
function issueJwtForUser(user) {
  return jwt.sign(
    { id: user.id, username: user.username, is_guest: false, rating: user.rating },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
}

module.exports = { configurePassport, issueJwtForUser };
