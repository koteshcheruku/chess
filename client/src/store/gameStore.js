import { create } from 'zustand';

export const useGameStore = create((set, get) => ({
  gameId: null,
  playerColor: null,
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  moves: [],       // { from, to, san, promotion }
  clocks: { white: 300, black: 300 },
  white: null,     // { id, username, rating }
  black: null,
  result: null,    // '1-0', '0-1', '1/2-1/2'
  resultReason: null,
  drawOffered: false,
  drawOfferedBy: null,
  status: 'idle',  // 'idle' | 'waiting' | 'active' | 'finished'

  setGame: (data) => set({ ...data }),

  applyMove: ({ move, fen, turn, clocks }) =>
    set((s) => ({
      fen,
      moves: [...s.moves, move],
      clocks,
    })),

  applyClockUpdate: (clocks) => set({ clocks }),

  endGame: ({ result, reason }) =>
    set({ result, resultReason: reason, status: 'finished' }),

  setDrawOffer: (username) =>
    set({ drawOffered: true, drawOfferedBy: username }),

  clearDrawOffer: () => set({ drawOffered: false, drawOfferedBy: null }),

  reset: () => set({
    gameId: null,
    playerColor: null,
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    moves: [],
    clocks: { white: 300, black: 300 },
    white: null,
    black: null,
    result: null,
    resultReason: null,
    drawOffered: false,
    drawOfferedBy: null,
    status: 'idle',
  }),
}));
