import { useCallback, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useSocketEvent, useSocketEmit } from './useSocket';

/**
 * Binds all game socket events to the game store.
 * Call this once from GamePage.
 */
export function useGame(gameId) {
  const { setGame, applyMove, applyClockUpdate, endGame, setDrawOffer, reset } = useGameStore();
  const emit = useSocketEmit();

  // --- Socket event handlers ---
  useSocketEvent('game_joined', useCallback((data) => {
    setGame({
      gameId: data.gameId,
      playerColor: data.playerColor,
      fen: data.fen,
      clocks: data.clocks,
      white: data.white,
      black: data.black,
      isBotGame: data.isBotGame,
      botElo: data.botElo,
      status: 'waiting',
    });
  }, [setGame]));

  useSocketEvent('game_start', useCallback((data) => {
    setGame({ status: 'active', white: data.white, black: data.black });
  }, [setGame]));

  useSocketEvent('move_made', useCallback((data) => {
    applyMove(data);
  }, [applyMove]));

  useSocketEvent('clock_update', useCallback((clocks) => {
    applyClockUpdate(clocks);
  }, [applyClockUpdate]));

  useSocketEvent('game_end', useCallback((data) => {
    endGame(data);
  }, [endGame]));

  useSocketEvent('draw_offered', useCallback(({ from }) => {
    setDrawOffer(from);
  }, [setDrawOffer]));

  useSocketEvent('error', useCallback((err) => {
    console.error('[Game error]', err.code, err.message);
  }, []));

  // --- Join game on mount ---
  useEffect(() => {
    if (gameId) {
      emit('join_game', { gameId });
    }
    return () => {
      // Don't reset on cleanup — let user see end state
    };
  }, [gameId, emit]);

  // --- Actions ---
  const makeMove = useCallback((move) => {
    emit('make_move', { gameId, move });
  }, [emit, gameId]);

  const resign = useCallback(() => {
    emit('resign', { gameId });
  }, [emit, gameId]);

  const offerDraw = useCallback(() => {
    emit('offer_draw', { gameId });
  }, [emit, gameId]);

  const acceptDraw = useCallback(() => {
    emit('accept_draw', { gameId });
  }, [emit, gameId]);

  return { makeMove, resign, offerDraw, acceptDraw };
}
