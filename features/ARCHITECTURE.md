# 🏗️ System Architecture

## 🔁 High-Level Flow

1. User joins game
2. Backend creates match room
3. Players connect via WebSocket
4. Moves are broadcast in real-time
5. State stored in PostgreSQL

---

## ⚡ Real-Time System

### Technology
- Socket.io

### Flow

Client A → Server → Client B


### Events

- `join_game`
- `make_move`
- `receive_move`
- `game_end`

---

## 🧠 Game Engine

- Chess.js (for move validation)
- FEN-based board tracking

---

## 🗄️ Database Design

### Tables

#### Users
- id
- username
- rating
- created_at

#### Games
- id
- player1_id
- player2_id
- result
- moves (JSON)

#### Puzzles
- id
- fen
- solution
- difficulty

---

## 🔐 Authentication

- JWT for registered users
- Temporary token for guests (24h expiry)

---

## ⚙️ Scaling Strategy

- Redis (for sockets scaling)
- Horizontal scaling (multiple Node instances)