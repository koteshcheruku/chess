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
app.set('trust proxy', 1);
const server = http.createServer(app);
app.get('/test', (req, res) => {
  console.log("Test route hit!"); // Check Render logs for this
  res.json({ message: "Pass! Backend is working." });
});

// --- Build allowed origins list from env (comma-separated) + localhost fallback ---
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  ...(process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',').map(u => u.trim()).filter(Boolean)
    : []),
];

// --- Security & Utilities ---
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    console.warn(`[CORS] Blocked origin: ${origin}`);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
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

// TEMP: Create admin
app.get('/api/setup-admin', async (req, res) => {
  try {
    const { register } = require('./src/services/authService');
    const result = await register({
      username: 'admin_kotesh', // using a unique username just in case
      email: 'koteshcheruku000@gmail.com',
      password: 'DummyPass1!'
    });
    res.json({ message: 'Admin created successfully!', user: result.user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

