import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore, BOARD_THEMES } from '../store/settingsStore';
import api from '../services/api';
import './Page.css';

const HINT_SQ  = 'rgba(255,200,0,0.5)';
const WRONG_SQ = 'rgba(239,68,68,0.5)';
const CORRECT_SQ = 'rgba(100,220,100,0.5)';
const TIMER_MAX = 60;

export default function PuzzlePage() {
  const { user } = useAuthStore();
  const { boardTheme } = useSettingsStore();

  // Board colors from current theme
  const theme = BOARD_THEMES.find((t) => t.id === boardTheme) || BOARD_THEMES[0];

  // Use refs for values that must be stable across closure captures
  const chessRef   = useRef(null);   // Chess.js instance — never stale
  const submittedRef = useRef(false); // prevents double-submit without re-render lag
  const timerRef   = useRef(null);
  const startTimeRef = useRef(null);
  const puzzleRef  = useRef(null);   // current puzzle data
  const playerMovesRef = useRef([]); // accumulated player moves

  // React state — only for UI rendering
  const [fen, setFen]           = useState('');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [status, setStatus]     = useState('idle'); // idle|playing|success|fail
  const [feedback, setFeedback] = useState(null);
  const [ratingDelta, setRatingDelta] = useState(null);
  const [newRating, setNewRating]     = useState(null);
  const [timeLeft, setTimeLeft]       = useState(TIMER_MAX);
  const [customStyles, setCustomStyles] = useState({});
  const [puzzleDisplay, setPuzzleDisplay] = useState(null); // puzzle info for UI
  const [orientation, setOrientation]    = useState('white');

  // ─── Submit solution to backend ──────────────────────────────────────────
  const submitSolution = useCallback(async (moves) => {
    if (submittedRef.current || !puzzleRef.current) return;
    submittedRef.current = true;
    clearInterval(timerRef.current);

    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
    try {
      const { data } = await api.post('/puzzle/submit', {
        puzzleId: puzzleRef.current.id,
        moves,
        timeTaken,
      });
      setStatus(data.success ? 'success' : 'fail');
      setRatingDelta(data.delta);
      setNewRating(data.newRating);

      if (!data.success && data.correctMoves) {
        const styles = {};
        data.correctMoves.forEach((uci) => {
          styles[uci.slice(0, 2)] = { background: HINT_SQ };
          styles[uci.slice(2, 4)] = { background: HINT_SQ };
        });
        setCustomStyles(styles);
      }
    } catch { /* best effort */ }
  }, []);

  // ─── Timeout handler ─────────────────────────────────────────────────────
  const handleTimeout = useCallback(() => {
    if (submittedRef.current) return;
    setStatus('fail');
    submittedRef.current = true;
    clearInterval(timerRef.current);
  }, []);

  // ─── Load a new puzzle ───────────────────────────────────────────────────
  const loadPuzzle = useCallback(async () => {
    // Clear timer immediately
    clearInterval(timerRef.current);

    // Reset all refs synchronously (no re-render lag)
    submittedRef.current = false;
    playerMovesRef.current = [];
    puzzleRef.current = null;
    chessRef.current = null;

    // Reset UI state
    setLoading(true);
    setError('');
    setStatus('idle');
    setFeedback(null);
    setRatingDelta(null);
    setNewRating(null);
    setCustomStyles({});
    setTimeLeft(TIMER_MAX);
    setFen('');

    try {
      const { data } = await api.get('/puzzle/random');
      const c = new Chess(data.fen);

      // Store in refs
      chessRef.current = c;
      puzzleRef.current = data;

      // Determine board orientation from whose turn it is
      const turn = c.turn(); // 'w' | 'b'
      setOrientation(turn === 'w' ? 'white' : 'black');
      setFen(data.fen);
      setPuzzleDisplay(data);
      setStatus('playing');
      startTimeRef.current = Date.now();

      // Start countdown
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            handleTimeout();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load puzzle.');
    } finally {
      setLoading(false);
    }
  }, [handleTimeout]);

  // Mount: load first puzzle; cleanup timer on unmount
  useEffect(() => {
    loadPuzzle();
    return () => { clearInterval(timerRef.current); };
  }, []);

  // ─── Handle piece drop ───────────────────────────────────────────────────
  const onPieceDrop = useCallback((from, to) => {
    // Guard: must be playing and not already submitted
    if (status !== 'playing' || submittedRef.current) return false;
    if (!chessRef.current || !puzzleRef.current) return false;

    const result = chessRef.current.move({ from, to, promotion: 'q' });
    if (!result) return false; // illegal move

    const uci = from + to + (result.promotion ?? '');
    const newMoves = [...playerMovesRef.current, uci];
    playerMovesRef.current = newMoves;

    setFen(chessRef.current.fen());

    // Check against solution
    const expected = puzzleRef.current.moves[newMoves.length - 1];
    const isCorrect = expected && uci.toLowerCase() === expected.toLowerCase();

    if (isCorrect) {
      setCustomStyles({ [from]: { background: CORRECT_SQ }, [to]: { background: CORRECT_SQ } });

      if (newMoves.length >= puzzleRef.current.moves.length) {
        // All moves solved!
        submitSolution(newMoves);
      } else {
        // Play opponent's response after a short delay
        setTimeout(() => {
          if (!chessRef.current) return;
          const opponentUci = puzzleRef.current.moves[newMoves.length];
          if (opponentUci) {
            const r = chessRef.current.move({
              from: opponentUci.slice(0, 2),
              to: opponentUci.slice(2, 4),
              promotion: opponentUci[4] || 'q',
            });
            if (r) {
              setFen(chessRef.current.fen());
              setCustomStyles({});
            }
          }
        }, 600);
      }
    } else {
      // Wrong move — undo it
      chessRef.current.undo();
      playerMovesRef.current = newMoves.slice(0, -1); // remove the bad move
      setFen(chessRef.current.fen());
      setCustomStyles({ [from]: { background: WRONG_SQ }, [to]: { background: WRONG_SQ } });
      setTimeout(() => setCustomStyles({}), 800);
    }

    return true;
  }, [status, submitSolution]);

  // ─── Derived ─────────────────────────────────────────────────────────────
  const timePercent = (timeLeft / TIMER_MAX) * 100;
  const timerColor = timeLeft < 10
    ? 'var(--error)'
    : timeLeft < 20
    ? 'var(--warning)'
    : 'var(--accent)';

  const boardWidth = Math.min(520, window.innerWidth - 32);

  // ─── Render ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="page">
        <div className="full-center"><div className="spinner spinner-lg" /></div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page">
        <div className="alert alert-error">
          {error}{' '}
          <button className="btn btn-ghost btn-sm" onClick={loadPuzzle}>Retry</button>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div style={{
        display: 'grid',
        gridTemplateColumns: `${boardWidth}px 1fr`,
        gap: 'var(--space-6)',
        alignItems: 'start',
      }}>
        {/* Board column */}
        <div>
          {/* Timer bar */}
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span className="text-sm text-muted">
                {puzzleDisplay && (
                  <>Puzzle ELO: <strong style={{ color: 'var(--text)' }}>{puzzleDisplay.rating}</strong></>
                )}
              </span>
              <span className="text-sm" style={{ color: timerColor, fontWeight: 600 }}>
                {timeLeft}s
              </span>
            </div>
            <div style={{ height: '4px', background: 'var(--surface-3)', borderRadius: '2px' }}>
              <div style={{
                height: '100%',
                width: `${timePercent}%`,
                background: timerColor,
                borderRadius: '2px',
                transition: 'width 1s linear, background var(--transition)',
              }} />
            </div>
          </div>

          <Chessboard
            id="puzzle-board"
            position={fen}
            onPieceDrop={onPieceDrop}
            boardOrientation={orientation}
            customDarkSquareStyle={{ backgroundColor: theme.sqDark }}
            customLightSquareStyle={{ backgroundColor: theme.sqLight }}
            customBoardStyle={{ borderRadius: '4px' }}
            customSquareStyles={customStyles}
            arePiecesDraggable={status === 'playing' && !submittedRef.current}
            boardWidth={boardWidth}
            showBoardNotation
          />
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', paddingTop: 'var(--space-6)' }}>
          <div>
            <h2 style={{ marginBottom: 'var(--space-1)' }}>
              {status === 'success' ? '✓ Correct!' : status === 'fail' ? '✗ Incorrect' : 'Find the best move'}
            </h2>
            <p>{orientation === 'white' ? 'White to move' : 'Black to move'}</p>
          </div>

          {puzzleDisplay?.themes?.length > 0 && status !== 'playing' && (
            <div>
              <p className="text-sm text-muted font-semibold" style={{ marginBottom: 'var(--space-2)' }}>Themes</p>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {puzzleDisplay.themes.map((t) => (
                  <span key={t} className="badge">{t}</span>
                ))}
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="alert alert-success">
              Puzzle solved!
              {ratingDelta !== null && (
                <span style={{ display: 'block', marginTop: 4 }}>
                  Rating: <strong>{newRating}</strong>{' '}
                  <span style={{ color: ratingDelta >= 0 ? 'var(--success)' : 'var(--error)' }}>
                    ({ratingDelta > 0 ? '+' : ''}{ratingDelta})
                  </span>
                </span>
              )}
            </div>
          )}

          {status === 'fail' && (
            <div className="alert alert-error">
              {timeLeft === 0 ? "Time's up." : 'Wrong move.'}{' '}
              Correct solution highlighted on the board.
              {ratingDelta !== null && (
                <span style={{ display: 'block', marginTop: 4 }}>
                  Rating: <strong>{newRating}</strong>{' '}
                  <span>({ratingDelta})</span>
                </span>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {(status === 'success' || status === 'fail') && (
              <button id="next-puzzle" className="btn btn-primary" onClick={loadPuzzle}>
                Next puzzle →
              </button>
            )}
            {status === 'playing' && (
              <button
                id="give-up-puzzle"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  clearInterval(timerRef.current);
                  setStatus('fail');
                  submittedRef.current = true;
                  submitSolution(playerMovesRef.current).catch(() => {});
                }}
              >
                Give up
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
