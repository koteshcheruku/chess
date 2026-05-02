# 🔌 API Design

## Base URL

/api


---

## 👤 Auth

### Register
POST /auth/register

### Login
POST /auth/login

---

## ♟️ Game

### Create Game
POST /game/create

### Get Game
GET /game/:id

---

## 🧩 Puzzles

### Get Puzzle
GET /puzzle/random

### Submit Solution
POST /puzzle/submit

---

## 📊 User

### Get Profile
GET /user/:id

### Update Rating
POST /user/rating

---

## ⚡ Socket Events

### Client → Server
- `join_game`
- `make_move`

### Server → Client
- `game_start`
- `move_made`
- `game_end`

