import { useCallback, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { getSocket } from '../socket/socket';
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
      status: data.status ?? 'waiting', // Use server-provided status (may be 'active' on reconnect)
    });
  }, [setGame]));

  useSocketEvent('game_start', useCallback((data) => {
    setGame({
      status: 'active',
      white: data.white,
      black: data.black,
      fen: data.fen,                      // Current FEN (important for reconnects mid-game)
      ...(data.clocks ? { clocks: data.clocks } : {}), // Sync clocks on reconnect
    });
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

  // --- Join game on mount — re-join on every reconnect too ---
  useEffect(() => {
    if (!gameId) return;

    const socket = getSocket();
    if (!socket) {
      console.warn('[useGame] No socket available for join_game');
      return;
    }

    const doJoin = () => emit('join_game', { gameId });

    // Persistent listener: fires on initial connect AND every subsequent reconnect
    // Server handles the "already started" case via the else-if(state.started) branch
    socket.on('connect', doJoin);

    // If already connected, join immediately
    if (socket.connected) doJoin();

    return () => socket.off('connect', doJoin);
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
