import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Chess } from 'chess.js';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore, BOARD_THEMES } from '../store/settingsStore';
import { useGame } from '../hooks/useGame';
import ChessBoard from '../components/ChessBoard/ChessBoard';
import GameTimer from '../components/GameTimer/GameTimer';
import MoveList from '../components/MoveList/MoveList';
import './Page.css';

export default function GamePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { boardTheme } = useSettingsStore();
  const theme = BOARD_THEMES.find((t) => t.id === boardTheme) || BOARD_THEMES[0];
  const boardContainerRef = useRef(null);
  const [boardWidth, setBoardWidth] = useState(480);

  useEffect(() => {
    function measure() {
      if (boardContainerRef.current) {
        const w = boardContainerRef.current.offsetWidth;
        setBoardWidth(Math.min(w, 560));
      }
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const {
    fen, playerColor, white, black, moves,
    clocks, status, result, resultReason,
    drawOffered, drawOfferedBy, reset,
  } = useGameStore();

  // Hook that wires socket events → store + exposes actions
  const { makeMove, resign, offerDraw, acceptDraw } = useGame(id);

  // Build Chess instance to compute legal moves for highlighting
  const chess = new Chess(fen);
  const isMyTurn = (playerColor === 'white' && chess.turn() === 'w')
                || (playerColor === 'black' && chess.turn() === 'b');
  const isFinished = status === 'finished' || result !== null;

  // Last move for board highlighting
  const lastMove = moves.length > 0 ? moves[moves.length - 1] : null;

  const handleMove = (move) => {
    if (!isMyTurn || isFinished) return;
    // Optimistic: try move locally first
    const test = new Chess(fen);
    const result = test.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
    if (!result) return; // Illegal locally — server will reject anyway
    makeMove(move);
  };

  const gameResultLabel = () => {
    if (!result) return '';
    if (result === '1/2-1/2') return 'Draw';
    const won = (result === '1-0' && playerColor === 'white') ||
                (result === '0-1' && playerColor === 'black');
    return won ? 'You won' : 'You lost';
  };

  const reasonLabel = (r) => {
    const map = {
      checkmate: 'by checkmate',
      resignation: 'by resignation',
      timeout: 'on time',
      draw_agreement: 'by agreement',
      stalemate: 'by stalemate',
    };
    return map[r] || r;
  };

  // Board is flipped for black
  const boardOrientation = playerColor === 'black' ? 'black' : 'white';

  // For black's perspective: opponent timer on top, mine on bottom
  const topPlayer  = playerColor === 'white' ? black : white;
  const topClock   = playerColor === 'white' ? clocks.black : clocks.white;
  const botPlayer  = playerColor === 'white' ? white : black;
  const botClock   = playerColor === 'white' ? clocks.white : clocks.black;
  const topIsActive  = (playerColor === 'white' && chess.turn() === 'b')
                     || (playerColor === 'black' && chess.turn() === 'w');
  const botIsActive  = !topIsActive;

  return (
    <main className="page">
      <div className="game-layout">
        {/* Board column */}
        <div ref={boardContainerRef}>
          {/* Opponent timer */}
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <GameTimer
              seconds={topClock}
              isActive={topIsActive && !isFinished}
              label={topPlayer?.username ?? '...'}
              rating={topPlayer?.rating ?? 0}
            />
          </div>

          <ChessBoard
            fen={fen}
            playerColor={boardOrientation}
            lastMove={lastMove}
            onMove={handleMove}
            disabled={!isMyTurn || isFinished || status !== 'active'}
            boardWidth={boardWidth}
            customDarkSquareStyle={{ backgroundColor: theme.sqDark }}
            customLightSquareStyle={{ backgroundColor: theme.sqLight }}
          />

          {/* My timer */}
          <div style={{ marginTop: 'var(--space-3)' }}>
            <GameTimer
              seconds={botClock}
              isActive={botIsActive && !isFinished}
              label={botPlayer?.username ?? user?.username ?? '...'}
              rating={botPlayer?.rating ?? user?.rating ?? 0}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Move list */}
          <MoveList moves={moves} />

          {/* Draw offer */}
          {drawOffered && !isFinished && (
            <div className="card card-sm">
              <p className="text-sm">{drawOfferedBy} offered a draw</p>
              <div className="flex gap-2 mt-2">
                <button id="accept-draw" className="btn btn-primary btn-sm" onClick={acceptDraw}>Accept</button>
                <button id="decline-draw" className="btn btn-ghost btn-sm" onClick={() => useGameStore.getState().clearDrawOffer()}>Decline</button>
              </div>
            </div>
          )}

          {/* Controls */}
          {!isFinished && status === 'active' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <button id="offer-draw-btn" className="btn btn-ghost btn-sm" onClick={offerDraw}>Offer draw</button>
              <button id="resign-btn" className="btn btn-danger btn-sm" onClick={() => { if (window.confirm('Resign this game?')) resign(); }}>Resign</button>
            </div>
          )}

          {status === 'waiting' && (
            <div className="card card-sm">
              <p className="text-sm text-muted">Waiting for opponent...</p>
              <div className="spinner mt-2" />
            </div>
          )}
        </div>
      </div>

      {/* Result overlay */}
      {isFinished && result && (
        <div className="game-result-overlay">
          <div className="game-result-card">
            <h2>{gameResultLabel()}</h2>
            <p className="game-result-reason">{reasonLabel(resultReason)}</p>
            <div className="game-result-actions">
              <button id="play-again" className="btn btn-primary" onClick={() => { reset(); navigate('/play'); }}>
                Play again
              </button>
              <button id="go-home" className="btn btn-ghost" onClick={() => { reset(); navigate('/'); }}>
                Home
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
