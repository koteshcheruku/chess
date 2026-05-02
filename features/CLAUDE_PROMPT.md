# 🧠 MASTER PROMPT FOR CLAUDE

You are a senior full-stack engineer.

Build a production-ready chess web app with the following requirements:

---

## 🎯 CORE IDEA

This is NOT just a chess app.

This is a **chess improvement platform** for players stuck at a certain ELO.

Users should:
- Practice puzzles
- Learn openings, middlegame, endgame
- Play real-time games
- Improve their rating

---

## 🏗️ TECH STACK

Frontend:
- React (Vite)
- TailwindCSS (NO gradients, NO glassmorphism)
- react-chessboard
- socket.io-client

Backend:
- Node.js
- Express.js
- Socket.io

Database:
- PostgreSQL

---

## ⚡ FEATURES

### 1. Real-Time Multiplayer
- Bullet / Blitz / Rapid
- WebSocket-based moves
- Server authoritative state

### 2. Puzzle System
- Random puzzles
- Difficulty-based selection
- Track success rate

### 3. Learning Modules
- Openings
- Middlegame
- Endgame

### 4. Bots (IMPORTANT)
- ELO-based bots:
  - 300
  - 500
  - 800
  - 1000
  - 1200
  - 1500
- Use Stockfish or simple engine depth mapping

### 5. Guest Users
- 24-hour access
- Temporary rating

---

## 🎨 UI RULES (STRICT)

- NO gradients
- NO glassmorphism
- NO purple-blue combos
- Use flat colors + one accent color
- Clean typography (one font)
- Proper spacing and readability
- No fake UI elements

Rewrite all UI text:
- Plain English only
- No buzzwords like "empower", "revolutionize"

---

## 📱 RESPONSIVENESS

- Mobile-first design
- Chess pieces must support drag-and-drop on mobile
- Smooth interactions

---

## 🔐 SECURITY

- JWT authentication
- Rate limiting
- Input validation
- Secure WebSocket handling
- Prevent cheating (server validates moves)

---

## 📦 DELIVERABLES

1. Full project structure
2. Backend APIs
3. WebSocket server
4. PostgreSQL schema
5. React UI components
6. Bot integration
7. Puzzle integration
8. Deployment steps

---

## 🚫 DO NOT

- Do not use fake UI patterns
- Do not generate placeholder fluff content
- Do not overdesign UI

---

Build this like a real product, not a demo.