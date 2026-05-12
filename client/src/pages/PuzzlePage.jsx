import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore, BOARD_THEMES } from '../store/settingsStore';
import api from '../services/api';
import './Page.css';

const HINT_SQ  = 'rgba(255,200,0,0.5)';
const WRONG_SQ = 'rgba(239,68,68,0.5)';
const CORRECT_SQ = 'rgba(100,220,100,0.5)';
const REPLAY_FROM = 'rgba(120,180,255,0.6)';
const REPLAY_TO   = 'rgba(70,140,250,0.8)';
const TIMER_MAX = 60;

const DIFFICULTY_OPTIONS = [
  { value: 'easy',   label: 'Easy',   icon: '🟢', desc: 'Below your level' },
  { value: 'medium', label: 'Medium', icon: '🟡', desc: 'Your rating range' },
  { value: 'hard',   label: 'Hard',   icon: '🟠', desc: 'Above your level' },
  { value: 'master', label: 'Master', icon: '🔴', desc: 'Expert tactics' },
];

export default function PuzzlePage() {
  const navigate = useNavigate();
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
  const replayTimerRef = useRef(null); // for solution replay animation

  // React state — only for UI rendering
  const [fen, setFen]           = useState('');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [status, setStatus]     = useState('idle'); // idle|playing|success|fail|replaying
  const [feedback, setFeedback] = useState(null);
  const [ratingDelta, setRatingDelta] = useState(null);
  const [newRating, setNewRating]     = useState(null);
  const [timeLeft, setTimeLeft]       = useState(TIMER_MAX);
  const [customStyles, setCustomStyles] = useState({});
  const [puzzleDisplay, setPuzzleDisplay] = useState(null); // puzzle info for UI
  const [orientation, setOrientation]    = useState('white');
  const [difficulty, setDifficulty]      = useState('medium');
  const [solutionMoves, setSolutionMoves] = useState([]); // correct moves from backend
  const [replayStep, setReplayStep]      = useState(-1); // current step in replay animation

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
      setSolutionMoves(data.correctMoves || []);

      if (!data.success && data.correctMoves) {
        // Highlight first move squares as a hint
        const firstMove = data.correctMoves[0];
        if (firstMove) {
          const styles = {};
          styles[firstMove.slice(0, 2)] = { background: HINT_SQ };
          styles[firstMove.slice(2, 4)] = { background: HINT_SQ };
          setCustomStyles(styles);
        }
      }
    } catch { /* best effort */ }
  }, []);

  // ─── Timeout handler ─────────────────────────────────────────────────────
  const handleTimeout = useCallback(() => {
    if (submittedRef.current) return;
    setStatus('fail');
    submittedRef.current = true;
    clearInterval(timerRef.current);
    // Submit with whatever moves were made to get the solution back
    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
    (async () => {
      try {
        const { data } = await api.post('/puzzle/submit', {
          puzzleId: puzzleRef.current.id,
          moves: playerMovesRef.current,
          timeTaken,
        });
        setRatingDelta(data.delta);
        setNewRating(data.newRating);
        setSolutionMoves(data.correctMoves || []);
      } catch { /* best effort */ }
    })();
  }, []);

  // ─── Show Solution Replay ────────────────────────────────────────────────
  const showSolution = useCallback(() => {
    if (!puzzleRef.current || solutionMoves.length === 0) return;

    // Reset the board to the puzzle's starting position
    const c = new Chess(puzzleRef.current.fen);
    chessRef.current = c;
    setFen(c.fen());
    setStatus('replaying');
    setReplayStep(-1);
    setCustomStyles({});

    let step = 0;
    replayTimerRef.current = setInterval(() => {
      if (step >= solutionMoves.length) {
        clearInterval(replayTimerRef.current);
        setReplayStep(solutionMoves.length - 1);
        setStatus('fail'); // go back to fail state after replay
        return;
      }

      const uci = solutionMoves[step];
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci[4] || undefined;

      const result = c.move({ from, to, promotion });
      if (result) {
        setFen(c.fen());
        setCustomStyles({
          [from]: { background: REPLAY_FROM },
          [to]:   { background: REPLAY_TO },
        });
        setReplayStep(step);
      }

      step++;
    }, 1000);
  }, [solutionMoves]);

  // ─── Quit Puzzle ─────────────────────────────────────────────────────────
  const handleQuit = useCallback(() => {
    clearInterval(timerRef.current);
    navigate('/');
  }, [navigate]);

  // ─── Skip Puzzle ─────────────────────────────────────────────────────────
  const handleSkip = useCallback(async () => {
    if (submittedRef.current || !puzzleRef.current) return;
    submittedRef.current = true;
    clearInterval(timerRef.current);
    try {
      await api.post('/puzzle/skip', { puzzleId: puzzleRef.current.id });
    } catch { /* ignore */ }
    loadPuzzle();
  }, [loadPuzzle]);

  // ─── Retry Puzzle ────────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    if (!puzzleRef.current) return;
    clearInterval(replayTimerRef.current);
    
    // Reset state to playing the same puzzle
    const c = new Chess(puzzleRef.current.fen);
    chessRef.current = c;
    setFen(c.fen());
    
    submittedRef.current = false;
    playerMovesRef.current = [];
    
    setStatus('playing');
    setCustomStyles({});
    setFeedback(null);
    setRatingDelta(null);
    setSolutionMoves([]);
    setReplayStep(-1);
    setTimeLeft(TIMER_MAX);
    startTimeRef.current = Date.now();
    
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          handleTimeout();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [handleTimeout]);

  // ─── Show Next Move ──────────────────────────────────────────────────────
  const handleShowNextMove = useCallback(() => {
    if (status !== 'playing' || !puzzleRef.current) return;
    
    const nextMoveUci = puzzleRef.current.moves[playerMovesRef.current.length];
    if (nextMoveUci) {
      const from = nextMoveUci.slice(0, 2);
      const to = nextMoveUci.slice(2, 4);
      setCustomStyles((prev) => ({
        ...prev,
        [from]: { background: HINT_SQ },
        [to]: { background: HINT_SQ },
      }));
    }
  }, [status]);

  // Cleanup replay timer on unmount
  useEffect(() => {
    return () => { clearInterval(replayTimerRef.current); };
  }, []);

  // ─── Load a new puzzle ───────────────────────────────────────────────────
  const loadPuzzle = useCallback(async () => {
    // Clear timers immediately
    clearInterval(timerRef.current);
    clearInterval(replayTimerRef.current);

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
    setSolutionMoves([]);
    setReplayStep(-1);

    try {
      const { data } = await api.get(`/puzzle/random?difficulty=${difficulty}`);
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
  }, [handleTimeout, difficulty]);

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
      // Wrong move — submit as failure immediately
      chessRef.current.undo();
      playerMovesRef.current = newMoves.slice(0, -1);
      setFen(chessRef.current.fen());
      setCustomStyles({ [from]: { background: WRONG_SQ }, [to]: { background: WRONG_SQ } });

      // Auto-submit on wrong move so user gets the answer
      submitSolution(playerMovesRef.current);
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
  const isFinished = status === 'success' || status === 'fail';

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
      {/* Difficulty selector */}
      <div className="puzzle-difficulty-bar">
        {DIFFICULTY_OPTIONS.map((d) => (
          <button
            key={d.value}
            id={`difficulty-${d.value}`}
            className={`puzzle-difficulty-btn ${difficulty === d.value ? 'active' : ''}`}
            onClick={() => setDifficulty(d.value)}
            disabled={status === 'playing' || status === 'replaying'}
            title={d.desc}
          >
            <span className="difficulty-icon">{d.icon}</span>
            <span className="difficulty-label">{d.label}</span>
          </button>
        ))}
      </div>

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
                {status === 'replaying' ? '▶ Replaying' : `${timeLeft}s`}
              </span>
            </div>
            <div style={{ height: '4px', background: 'var(--surface-3)', borderRadius: '2px' }}>
              <div style={{
                height: '100%',
                width: status === 'replaying' ? '100%' : `${timePercent}%`,
                background: status === 'replaying' ? 'var(--accent)' : timerColor,
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
              {status === 'success' ? '✓ Correct!' : status === 'fail' ? '✗ Incorrect' : status === 'replaying' ? '▶ Solution' : 'Find the best move'}
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
              {solutionMoves.length > 0 ? 'Click "Show Solution" to see the answer.' : 'Correct solution highlighted on the board.'}
              {ratingDelta !== null && (
                <span style={{ display: 'block', marginTop: 4 }}>
                  Rating: <strong>{newRating}</strong>{' '}
                  <span>({ratingDelta})</span>
                </span>
              )}
            </div>
          )}

          {status === 'replaying' && (
            <div className="alert" style={{ background: 'var(--surface-2)', border: '1px solid var(--accent)' }}>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>▶ Playing solution…</span>
              <span style={{ display: 'block', marginTop: 4, color: 'var(--text-muted)' }}>
                Move {replayStep + 1} of {solutionMoves.length}
              </span>
            </div>
          )}

          {/* Solution move list — shown after fail or replay */}
          {(status === 'fail' || status === 'replaying') && solutionMoves.length > 0 && (
            <div className="solution-moves-panel">
              <p className="text-sm text-muted font-semibold" style={{ marginBottom: 'var(--space-2)' }}>
                Solution moves
              </p>
              <div className="solution-moves-list">
                {solutionMoves.map((m, i) => (
                  <span
                    key={i}
                    className={`solution-move ${i <= replayStep ? 'played' : ''} ${i % 2 === 0 ? 'player-move' : 'opponent-move'}`}
                  >
                    {i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : ''}{m}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {status === 'fail' && solutionMoves.length > 0 && (
              <>
                <button
                  id="show-solution"
                  className="btn btn-accent"
                  onClick={showSolution}
                >
                  ▶ Show Solution
                </button>
                <button
                  id="retry-puzzle"
                  className="btn btn-secondary"
                  onClick={handleRetry}
                >
                  ↻ Retry Puzzle
                </button>
              </>
            )}
            {(isFinished || status === 'replaying') && (
              <button id="next-puzzle" className="btn btn-primary" onClick={loadPuzzle}>
                Next puzzle →
              </button>
            )}
            {status === 'playing' && (
              <>
                <button
                  id="show-next-move"
                  className="btn btn-accent"
                  onClick={handleShowNextMove}
                >
                  💡 Show Next Move
                </button>
                <button
                  id="skip-puzzle"
                  className="btn btn-secondary"
                  onClick={handleSkip}
                >
                  ⏭ Skip Puzzle
                </button>
                <button
                  id="quit-puzzle"
                  className="btn btn-ghost"
                  onClick={handleQuit}
                >
                  ✕ Quit
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
