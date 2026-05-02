const { Chess } = require('chess.js');

// Piece values in centipawns
const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

// Piece-square tables (white perspective, rank 1 at bottom = index 56+)
// These encourage good piece placement and penalize bad ones.
const PST = {
  p: [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
  ],
  n: [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
  ],
  b: [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
  ],
  r: [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0,
  ],
  q: [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
  ],
  k: [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20,
  ],
};

// ELO → { depth, randomness }
const BOT_CONFIG = {
  300:  { depth: 1, randomness: 0.9 },
  500:  { depth: 1, randomness: 0.6 },
  800:  { depth: 2, randomness: 0.3 },
  1000: { depth: 2, randomness: 0.1 },
  1200: { depth: 3, randomness: 0.05 },
  1500: { depth: 4, randomness: 0.0 },
};

function squareIndex(square) {
  const file = square.charCodeAt(0) - 97; // a=0, h=7
  const rank = parseInt(square[1]) - 1;   // 1=0, 8=7
  return (7 - rank) * 8 + file;
}

function evaluateBoard(chess) {
  if (chess.isCheckmate()) return chess.turn() === 'w' ? -99999 : 99999;
  if (chess.isDraw() || chess.isStalemate()) return 0;

  let score = 0;
  const board = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (!piece) continue;
      const idx = r * 8 + f;
      const pstIdx = piece.color === 'w' ? idx : (7 - r) * 8 + (7 - f);
      const pstBonus = PST[piece.type] ? PST[piece.type][pstIdx] : 0;
      const val = PIECE_VALUES[piece.type] + pstBonus;
      score += piece.color === 'w' ? val : -val;
    }
  }
  return score;
}

function minimax(chess, depth, alpha, beta, maximizing) {
  if (depth === 0 || chess.isGameOver()) {
    return { score: evaluateBoard(chess), move: null };
  }

  const moves = chess.moves({ verbose: true });
  let bestMove = moves[0];

  if (maximizing) {
    let maxScore = -Infinity;
    for (const move of moves) {
      chess.move(move);
      const { score } = minimax(chess, depth - 1, alpha, beta, false);
      chess.undo();
      if (score > maxScore) { maxScore = score; bestMove = move; }
      alpha = Math.max(alpha, maxScore);
      if (beta <= alpha) break;
    }
    return { score: maxScore, move: bestMove };
  } else {
    let minScore = Infinity;
    for (const move of moves) {
      chess.move(move);
      const { score } = minimax(chess, depth - 1, alpha, beta, true);
      chess.undo();
      if (score < minScore) { minScore = score; bestMove = move; }
      beta = Math.min(beta, minScore);
      if (beta <= alpha) break;
    }
    return { score: minScore, move: bestMove };
  }
}

/**
 * Get the best move for a bot of the given ELO.
 * @param {string} fen - current position
 * @param {number} eloLevel - one of 300, 500, 800, 1000, 1200, 1500
 * @returns {{ from, to, promotion? } | null}
 */
function getBotMove(fen, eloLevel) {
  const chess = new Chess(fen);
  if (chess.isGameOver()) return null;

  const config = BOT_CONFIG[eloLevel] || BOT_CONFIG[800];
  const moves = chess.moves({ verbose: true });

  // Random move based on randomness factor
  if (Math.random() < config.randomness) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const isMaximizing = chess.turn() === 'w';
  const { move } = minimax(chess, config.depth, -Infinity, Infinity, isMaximizing);
  return move || moves[Math.floor(Math.random() * moves.length)];
}

/**
 * Delay before bot responds (simulates thinking time).
 * Lower ELO = faster response (bots don't "think" long).
 */
function getBotDelay(eloLevel) {
  const delays = {
    300: [300, 800],
    500: [400, 1000],
    800: [600, 1500],
    1000: [800, 2000],
    1200: [1000, 2500],
    1500: [1500, 3500],
  };
  const [min, max] = delays[eloLevel] || [800, 2000];
  return min + Math.floor(Math.random() * (max - min));
}

module.exports = { getBotMove, getBotDelay };
