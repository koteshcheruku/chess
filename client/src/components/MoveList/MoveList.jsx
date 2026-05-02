import React, { useRef, useEffect } from 'react';
import './MoveList.css';

/**
 * MoveList — displays move history in algebraic notation (pairs per row).
 *
 * Props:
 *   moves – array of { san } objects
 */
export default function MoveList({ moves = [] }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [moves.length]);

  if (moves.length === 0) {
    return (
      <div className="move-list">
        <p className="move-list-empty">No moves yet</p>
      </div>
    );
  }

  // Pair moves: [white_move, black_move]
  const pairs = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({ num: i / 2 + 1, white: moves[i]?.san, black: moves[i + 1]?.san });
  }

  return (
    <div className="move-list">
      <div className="move-list-header">
        <span>#</span>
        <span>White</span>
        <span>Black</span>
      </div>
      <div className="move-list-body">
        {pairs.map(({ num, white, black }) => (
          <div key={num} className="move-row">
            <span className="move-num">{num}</span>
            <span className="move-san">{white}</span>
            <span className="move-san">{black ?? ''}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
