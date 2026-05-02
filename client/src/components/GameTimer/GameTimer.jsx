import React, { useEffect, useRef } from 'react';
import './GameTimer.css';

function formatTime(seconds) {
  if (seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * GameTimer — shows the clock for one side.
 *
 * Props:
 *   seconds     – remaining seconds (float)
 *   isActive    – true when it's this player's turn
 *   label       – player name
 *   rating      – player rating
 */
export default function GameTimer({ seconds = 300, isActive = false, label = '', rating = 0 }) {
  const isLow = seconds > 0 && seconds < 30;
  const isCritical = seconds > 0 && seconds < 10;

  return (
    <div className={`timer-card ${isActive ? 'timer-active' : ''} ${isLow ? 'timer-low' : ''} ${isCritical ? 'timer-critical' : ''}`}>
      <div className="timer-player">
        <span className="timer-name">{label}</span>
        <span className="timer-rating">{rating}</span>
      </div>
      <div className="timer-display">{formatTime(seconds)}</div>
    </div>
  );
}
