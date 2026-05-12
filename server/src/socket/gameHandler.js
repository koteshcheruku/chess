const { Chess } = require('chess.js');
const { createGame, getGame, finishGame, abortGame } = require('../services/gameService');
const { getBotMove, getBotDelay } = require('../services/botService');
const { query } = require('../config/db');

// In-memory active game state
// gameId -> { chess, whiteId, blackId, white_socket, black_socket,
//             white_time, black_time, increment, last_move_at,
//             timer_interval, is_bot_game, bot_elo, bot_color }
const activeGames = new Map();

const TIME_SECONDS = { '60': 60, '180': 180, '300': 300, '600': 600, '900': 900 };

function getGameForSocket(socket) {
  for (const [gameId, state] of activeGames) {
    if (state.white_socket === socket.id || state.black_socket === socket.id) {
      return { gameId, state };
    }
  }
  return null;
}

function startClock(io, gameId) {
  const state = activeGames.get(gameId);
  if (!state) return;

  state.last_move_at = Date.now();

  // Tick every second
  state.timer_interval = setInterval(() => {
    const s = activeGames.get(gameId);
    if (!s) { clearInterval(state.timer_interval); return; }

    const elapsed = (Date.now() - s.last_move_at) / 1000;
    const turn = s.chess.turn(); // 'w' or 'b'

    const remaining = turn === 'w'
      ? s.white_time - elapsed
      : s.black_time - elapsed;

    if (remaining <= 0) {
      clearInterval(s.timer_interval);
      const result = turn === 'w' ? '0-1' : '1-0';
      const loser = turn === 'w' ? s.white_socket : s.black_socket;
      io.to(gameId).emit('game_end', { result, reason: 'timeout' });
      finishGame(gameId, result, 'timeout').catch(console.error);
      activeGames.delete(gameId);
    } else {
      // Broadcast clock update every second
      const clocks = {
        white: turn === 'w' ? Math.max(0, remaining) : s.white_time,
        black: turn === 'b' ? Math.max(0, remaining) : s.black_time,
      };
      io.to(gameId).emit('clock_update', clocks);
    }
  }, 1000);
}

function stopClock(gameId) {
  const state = activeGames.get(gameId);
  if (state?.timer_interval) clearInterval(state.timer_interval);
}

function deductClock(state) {
  const elapsed = (Date.now() - state.last_move_at) / 1000;
  if (state.chess.turn() === 'w') {
    state.white_time = Math.max(0, state.white_time - elapsed + state.increment);
  } else {
    state.black_time = Math.max(0, state.black_time - elapsed + state.increment);
  }
  state.last_move_at = Date.now();
}

async function scheduleBotMove(io, gameId) {
  const state = activeGames.get(gameId);
  if (!state || !state.is_bot_game) return;
  if (state.chess.turn() !== state.bot_color) return;
  if (state.chess.isGameOver()) return;

  const delay = getBotDelay(state.bot_elo);
  setTimeout(() => {
    const s = activeGames.get(gameId);
    if (!s) return;
    if (s.chess.turn() !== s.bot_color) return;

    const botMove = getBotMove(s.chess.fen(), s.bot_elo);
    if (!botMove) return;

    try {
      const result = s.chess.move(botMove);
      if (!result) return;

      deductClock(s);

      const moveData = {
        move: { from: result.from, to: result.to, promotion: result.promotion || undefined, san: result.san },
        fen: s.chess.fen(),
        turn: s.chess.turn(),
        clocks: { white: s.white_time, black: s.black_time },
      };

      io.to(gameId).emit('move_made', moveData);

      if (s.chess.isGameOver()) {
        stopClock(gameId);
        const gameResult = s.chess.isCheckmate()
          ? (s.chess.turn() === 'w' ? '0-1' : '1-0')
          : '1/2-1/2';
        const reason = s.chess.isCheckmate() ? 'checkmate'
          : s.chess.isStalemate() ? 'stalemate'
          : 'draw';
        io.to(gameId).emit('game_end', { result: gameResult, reason });
        finishGame(gameId, gameResult, reason).catch(console.error);
        activeGames.delete(gameId);
      }
    } catch (err) {
      console.error('[Bot] Move error:', err.message);
    }
  }, delay);
}

function registerGameHandlers(io, socket) {
  // --- JOIN GAME ---
  socket.on('join_game', async ({ gameId }) => {
    try {
      const game = await getGame(gameId);
      const userId = socket.user.id;

      if (game.white_id !== userId && game.black_id !== userId) {
        return socket.emit('error', { code: 'NOT_PARTICIPANT', message: 'You are not a participant in this game' });
      }

      socket.join(gameId);
      const playerColor = game.white_id === userId ? 'white' : 'black';

      // Bot IDs are deterministic UUIDs starting with 00000000-0000-0000-0000-
      const BOT_ID_PREFIX = '00000000-0000-0000-0000-';
      const isWhiteBot = game.white_id.startsWith(BOT_ID_PREFIX);
      const isBlackBot = game.black_id && game.black_id.startsWith(BOT_ID_PREFIX);

      // Initialize or update active game state
      if (!activeGames.has(gameId)) {
        const seconds = TIME_SECONDS[game.time_control] || 300;
        activeGames.set(gameId, {
          chess: new Chess(),
          whiteId: game.white_id,
          blackId: game.black_id,
          white_socket: null,
          black_socket: null,
          white_time: seconds,
          black_time: seconds,
          increment: game.increment || 0,
          last_move_at: null,
          timer_interval: null,
          is_bot_game: game.is_bot_game,
          bot_elo: game.bot_elo,
          bot_color: isWhiteBot ? 'w' : 'b',  // which color the bot plays
          started: false,
        });
      }

      const state = activeGames.get(gameId);
      if (playerColor === 'white') state.white_socket = socket.id;
      else state.black_socket = socket.id;

      socket.emit('game_joined', {
        gameId,
        playerColor,
        fen: state.chess.fen(),
        clocks: { white: state.white_time, black: state.black_time },
        white: { id: game.white_id, username: game.white_username ?? 'White', rating: game.white_rating ?? 1200 },
        black: { id: game.black_id, username: game.black_username ?? 'Black', rating: game.black_rating ?? 1200 },
        timeControl: game.time_control,
        isBotGame: game.is_bot_game,
        botElo: game.bot_elo,
      });

      // Start game when both sides are present
      const bothConnected = state.is_bot_game
        ? (state.white_socket || state.black_socket)
        : (state.white_socket && state.black_socket);

      if (bothConnected && !state.started) {
        state.started = true;
        await query(`UPDATE games SET status = 'active', updated_at = NOW() WHERE id = $1`, [gameId]);
        io.to(gameId).emit('game_start', {
          gameId,
          fen: state.chess.fen(),
          white: { id: game.white_id, username: game.white_username, rating: game.white_rating },
          black: { id: game.black_id, username: game.black_username, rating: game.black_rating },
          timeControl: game.time_control,
          increment: game.increment,
        });
        startClock(io, gameId);

        // If bot plays white, fire first move
        if (state.is_bot_game && state.bot_color === 'w') {
          scheduleBotMove(io, gameId);
        }
      }
    } catch (err) {
      console.error('[join_game]', err.message);
      socket.emit('error', { code: 'JOIN_FAILED', message: err.message });
    }
  });

  // --- MAKE MOVE ---
  socket.on('make_move', ({ gameId, move }) => {
    const state = activeGames.get(gameId);
    if (!state) return socket.emit('error', { code: 'GAME_NOT_FOUND', message: 'Game not active' });

    const userId = socket.user.id;
    const isWhite = state.whiteId === userId;
    const isBlack = state.blackId === userId;

    if (!isWhite && !isBlack) {
      return socket.emit('error', { code: 'NOT_PARTICIPANT', message: 'Not your game' });
    }

    // Enforce turns
    const turn = state.chess.turn();
    if ((turn === 'w' && !isWhite) || (turn === 'b' && !isBlack)) {
      return socket.emit('error', { code: 'NOT_YOUR_TURN', message: 'Not your turn' });
    }

    // Server-authoritative move validation
    let result;
    try {
      result = state.chess.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
    } catch {
      result = null;
    }
    if (!result) {
      return socket.emit('error', { code: 'ILLEGAL_MOVE', message: 'Illegal move' });
    }

    // Update clocks
    deductClock(state);

    const moveData = {
      move: { from: result.from, to: result.to, promotion: result.promotion || undefined, san: result.san },
      fen: state.chess.fen(),
      turn: state.chess.turn(),
      clocks: { white: state.white_time, black: state.black_time },
    };

    io.to(gameId).emit('move_made', moveData);

    // Check game over
    if (state.chess.isGameOver()) {
      stopClock(gameId);
      const gameResult = state.chess.isCheckmate()
        ? (state.chess.turn() === 'w' ? '0-1' : '1-0')
        : '1/2-1/2';
      const reason = state.chess.isCheckmate() ? 'checkmate'
        : state.chess.isStalemate() ? 'stalemate'
        : 'draw';
      io.to(gameId).emit('game_end', { result: gameResult, reason });
      finishGame(gameId, gameResult, reason).catch(console.error);
      activeGames.delete(gameId);
      return;
    }

    // Schedule bot response
    if (state.is_bot_game) {
      scheduleBotMove(io, gameId);
    }
  });

  // --- RESIGN ---
  socket.on('resign', async ({ gameId }) => {
    const state = activeGames.get(gameId);
    if (!state) return;
    const isWhite = state.whiteId === socket.user.id;
    const result = isWhite ? '0-1' : '1-0';
    stopClock(gameId);
    io.to(gameId).emit('game_end', { result, reason: 'resignation' });
    await finishGame(gameId, result, 'resignation').catch(console.error);
    activeGames.delete(gameId);
  });

  // --- OFFER DRAW ---
  socket.on('offer_draw', ({ gameId }) => {
    const state = activeGames.get(gameId);
    if (!state) return;
    // Broadcast draw offer to the opponent
    socket.to(gameId).emit('draw_offered', { from: socket.user.username });
  });

  // --- ACCEPT DRAW ---
  socket.on('accept_draw', async ({ gameId }) => {
    const state = activeGames.get(gameId);
    if (!state) return;
    stopClock(gameId);
    io.to(gameId).emit('game_end', { result: '1/2-1/2', reason: 'draw_agreement' });
    await finishGame(gameId, '1/2-1/2', 'draw_agreement').catch(console.error);
    activeGames.delete(gameId);
  });

  // --- DISCONNECT handling ---
  socket.on('disconnect', () => {
    const found = getGameForSocket(socket);
    if (!found) return;
    const { gameId, state } = found;
    if (!state.started) return;
    // Give 30 seconds reconnect window — for now just broadcast disconnect
    socket.to(gameId).emit('opponent_disconnected', { username: socket.user.username });
  });
}

module.exports = { registerGameHandlers };
