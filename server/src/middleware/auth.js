const jwt = require('jsonwebtoken');

/**
 * Middleware: require a valid access token.
 * Attaches req.user = { id, username, is_guest, rating }
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Middleware: require auth but also allow guest tokens.
 * Same as requireAuth — guests get JWTs too.
 */
const requireAuthOrGuest = requireAuth;

/**
 * Middleware: block guest users from protected actions.
 */
function requireRegistered(req, res, next) {
  if (req.user?.is_guest) {
    return res.status(403).json({ error: 'Guest users cannot perform this action' });
  }
  next();
}

/**
 * Verify a JWT token without middleware (for socket use).
 */
function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { requireAuth, requireAuthOrGuest, requireRegistered, verifyToken };
