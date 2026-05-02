# 🧩 Puzzles & Bots System

## 🧩 Where to Get Chess Puzzles

### 1. Lichess Database (BEST FREE SOURCE)
- https://database.lichess.org/
- Contains millions of puzzles
- Includes:
  - FEN
  - Solution moves
  - Difficulty rating

---

### 2. Chess.com (Limited API)
- Not fully open
- Avoid scraping (legal issues)

---

### 3. Kaggle Datasets
- Search: "chess puzzles dataset"
- Good for offline usage

---

## 🧠 Puzzle Implementation

### Data Format

```json
{
  "fen": "...",
  "moves": ["e2e4", "e7e5"],
  "rating": 1200
}