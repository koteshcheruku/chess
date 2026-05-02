# ⚡ Real-Time Gameplay System

## 🧠 Core Idea
Synchronize chess moves instantly between players.

---

## 🔌 Socket Setup

### Server

```js
io.on("connection", (socket) => {
  socket.on("join_game", ({ gameId }) => {
    socket.join(gameId);
  });

  socket.on("make_move", ({ gameId, move }) => {
    io.to(gameId).emit("receive_move", move);
  });
});

🖥️ Client
socket.emit("join_game", { gameId });

socket.emit("make_move", { gameId, move });

socket.on("receive_move", (move) => {
  updateBoard(move);
});


⚡ Key Challenges
Sync lag
Move validation
Disconnections
✅ Solutions
Server-authoritative state
Reconnect logic
Move queue system