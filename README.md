# Chess Training Platform

Practice puzzles and improve your rating. Play real-time games against humans or bots.

## Stack

- **Frontend:** React (Vite), react-chessboard, chess.js, Zustand, Socket.io-client
- **Backend:** Node.js, Express, Socket.io, chess.js (server-side move validation)
- **Database:** PostgreSQL
- **Auth:** JWT (access + refresh tokens), bcrypt

---

## Prerequisites

- Node.js 18+
- PostgreSQL 13+

---

## Setup

### 1. Database

Create the database:
```sql
CREATE DATABASE chess;
```

### 2. Server

```bash
cd server
cp .env.example .env
# Edit .env: set DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
npm install
npm run db:migrate    # Create tables
npm run db:seed       # Seed 10 starter puzzles
npm run dev           # Start on http://localhost:5000
```

### 3. Client

```bash
cd client
npm install
npm run dev           # Start on http://localhost:5173
```

---

## Environment Variables (server/.env)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for access tokens (≥64 chars) |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens (≥64 chars) |
| `JWT_EXPIRES_IN` | Access token lifetime (default: `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime (default: `7d`) |
| `PORT` | API server port (default: `5000`) |
| `CLIENT_URL` | Frontend origin for CORS (default: `http://localhost:5173`) |

---

## Puzzle Import (Optional)

For a full puzzle set, download the Lichess puzzle CSV (~500MB):

1. Download from https://database.lichess.org/#puzzles
2. Use a CSV import script (coming soon — see `server/src/db/seed.js` for format)

The starter seed includes 10 verified mate-in-1 puzzles for testing.

---

## Features

- **Real-time multiplayer** — WebSocket-based moves, server-authoritative validation
- **Bot play** — 6 ELO levels (300, 500, 800, 1000, 1200, 1500) using minimax + piece-square tables
- **Puzzle mode** — 60s timer, rating-matched, immediate feedback
- **Guest mode** — 24h access, no signup required
- **Settings** — theme, sound, time control, password change, logout all devices
- **ELO system** — standard formula with K-factor for games and puzzles

---

## Project Structure

```
chess/
├── server/
│   ├── index.js                    ← entry point
│   ├── src/
│   │   ├── config/db.js            ← PostgreSQL pool
│   │   ├── db/migrate.js           ← schema creation
│   │   ├── db/seed.js              ← puzzle seed
│   │   ├── middleware/             ← auth, rate limit, validate
│   │   ├── routes/                 ← auth, game, puzzle, user
│   │   ├── services/               ← authService, botService, eloService, ...
│   │   └── socket/                 ← Socket.io handlers
│   └── .env
└── client/
    └── src/
        ├── components/             ← ChessBoard, GameTimer, MoveList, Navbar
        ├── hooks/                  ← useAuth, useSocket, useGame
        ├── pages/                  ← Home, Login, Register, Play, Game, Puzzle, Profile, Settings
        ├── services/api.js         ← Axios client with token refresh
        ├── socket/socket.js        ← Socket.io singleton
        └── store/                  ← Zustand stores (auth, game, settings)
```
