import React, { useState, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import './ChessBoard.css';

const LIGHT_SQ = '#f0d9b5';
const DARK_SQ  = '#b58863';
const LAST_MOVE_LIGHT = 'rgba(255, 230, 0, 0.45)';
const LAST_MOVE_DARK  = 'rgba(255, 200, 0, 0.55)';
const SELECTED_SQ = 'rgba(34, 197, 94, 0.45)';
const LEGAL_DOT   = 'rgba(34, 197, 94, 0.30)';

function getSquareColor(square) {
  const file = square.charCodeAt(0) - 97; // a=0
  const rank = parseInt(square[1]) - 1;
  return (file + rank) % 2 === 0 ? 'dark' : 'light';
}

/**
 * ChessBoard component wrapping react-chessboard.
 *
 * Props:
 *   fen          – current position FEN string
 *   playerColor  – 'white' | 'black' (for board orientation)
 *   lastMove     – { from, to } | null
 *   onMove       – callback({ from, to, promotion? })
 *   disabled     – disable interaction (opponent's turn, game over)
 *   legalMoves   – array of {from, to} objects to highlight
 */
export default function ChessBoard({
  fen,
  playerColor = 'white',
  lastMove = null,
  onMove,
  disabled = false,
  legalMoves = [],
}) {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [pendingPromotion, setPendingPromotion] = useState(null); // { from, to }

  // Build custom square styles
  const customSquareStyles = {};

  // Highlight last move
  if (lastMove) {
    const colorFrom = getSquareColor(lastMove.from) === 'light' ? LAST_MOVE_LIGHT : LAST_MOVE_DARK;
    const colorTo   = getSquareColor(lastMove.to)   === 'light' ? LAST_MOVE_LIGHT : LAST_MOVE_DARK;
    customSquareStyles[lastMove.from] = { background: colorFrom };
    customSquareStyles[lastMove.to]   = { background: colorTo   };
  }

  // Highlight selected square
  if (selectedSquare) {
    customSquareStyles[selectedSquare] = { background: SELECTED_SQ };
  }

  // Highlight legal move targets
  legalMoves.forEach(({ to }) => {
    customSquareStyles[to] = {
      background: `radial-gradient(circle, ${LEGAL_DOT} 36%, transparent 36%)`,
    };
  });

  const handlePieceDrop = useCallback((sourceSquare, targetSquare, piece) => {
    if (disabled) return false;

    // Check for promotion
    const isPawn = piece?.toLowerCase().includes('p');
    const isPromoRank = targetSquare[1] === '8' || targetSquare[1] === '1';

    if (isPawn && isPromoRank) {
      setPendingPromotion({ from: sourceSquare, to: targetSquare });
      return false; // Don't apply yet — wait for promotion dialog
    }

    onMove?.({ from: sourceSquare, to: targetSquare });
    setSelectedSquare(null);
    return true;
  }, [disabled, onMove]);

  const handleSquareClick = useCallback((square) => {
    if (disabled) return;

    if (selectedSquare && selectedSquare !== square) {
      onMove?.({ from: selectedSquare, to: square });
      setSelectedSquare(null);
    } else {
      setSelectedSquare(square === selectedSquare ? null : square);
    }
  }, [disabled, selectedSquare, onMove]);

  const handlePromotion = (piece) => {
    if (!pendingPromotion) return;
    onMove?.({ from: pendingPromotion.from, to: pendingPromotion.to, promotion: piece });
    setPendingPromotion(null);
    setSelectedSquare(null);
  };

  const boardWidth = Math.min(560, window.innerWidth - 32);

  return (
    <div className="chessboard-wrapper">
      <Chessboard
        id="main-board"
        position={fen}
        boardOrientation={playerColor}
        onPieceDrop={handlePieceDrop}
        onSquareClick={handleSquareClick}
        customBoardStyle={{ borderRadius: '4px', boxShadow: 'none' }}
        customDarkSquareStyle={{ backgroundColor: DARK_SQ }}
        customLightSquareStyle={{ backgroundColor: LIGHT_SQ }}
        customSquareStyles={customSquareStyles}
        arePiecesDraggable={!disabled}
        boardWidth={boardWidth}
        showBoardNotation
      />

      {/* Promotion dialog */}
      {pendingPromotion && (
        <div className="promotion-overlay">
          <div className="promotion-dialog">
            <p className="promotion-title">Promote pawn to:</p>
            <div className="promotion-options">
              {['q', 'r', 'b', 'n'].map((p) => (
                <button
                  key={p}
                  id={`promote-${p}`}
                  className="promotion-btn"
                  onClick={() => handlePromotion(p)}
                >
                  {p === 'q' ? '♛' : p === 'r' ? '♜' : p === 'b' ? '♝' : '♞'}
                  <span>{p === 'q' ? 'Queen' : p === 'r' ? 'Rook' : p === 'b' ? 'Bishop' : 'Knight'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
