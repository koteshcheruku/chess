import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Apply saved board theme on initial load (default: mahogany)
const savedBoardTheme = localStorage.getItem('chess-board-theme') || 'mahogany';
document.documentElement.setAttribute('data-board-theme', savedBoardTheme);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
