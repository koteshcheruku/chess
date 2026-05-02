```md
# 🎨 Frontend Architecture (React)

## 📁 Folder Structure


src/
├── components/
├── pages/
├── hooks/
├── services/
├── socket/
└── utils/


---

## 🧩 Key Components

- ChessBoard (react-chessboard)
- GameTimer
- PuzzleBoard
- AnalysisPanel

---

## ⚡ State Management

- Context API / Zustand

---

## 🔌 Socket Integration

```js
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

UI Goals
Clean board UI
Fast interactions
Minimal latency feel