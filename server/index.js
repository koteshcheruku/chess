require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const passport = require('passport');
const { configurePassport } = require('./src/config/passport');

const { initSocket } = require('./src/socket');
const authRoutes = require('./src/routes/auth');
const oauthRoutes = require('./src/routes/oauth');
const gameRoutes = require('./src/routes/game');
const puzzleRoutes = require('./src/routes/puzzle');
const userRoutes = require('./src/routes/user');
const { generalLimiter } = require('./src/middleware/rateLimit');

const app = express();
const server = http.createServer(app);

// --- Security & Utilities ---
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10kb' }));
app.use(generalLimiter);

// --- Session (only needed for OAuth callback) ---
app.use(session({
  secret: process.env.JWT_SECRET || 'session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 5 * 60 * 1000 }, // 5min, just for the OAuth handshake
}));

// --- Passport ---
configurePassport();
app.use(passport.initialize());
app.use(passport.session());

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/auth', oauthRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/puzzle', puzzleRoutes);
app.use('/api/user', userRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Global error handler
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// --- Socket.io ---
initSocket(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on:${PORT}`);
});

app.get('/test', (req, res) => res.json({ message: "Routes are working!" }));

