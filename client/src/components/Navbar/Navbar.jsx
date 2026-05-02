import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAuth } from '../../hooks/useAuth';
import './Navbar.css';

export default function Navbar() {
  const { user, accessToken } = useAuthStore();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path) => pathname === path ? 'nav-link active' : 'nav-link';
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand" onClick={closeMenu}>♟ Chess</Link>

        {/* Desktop links */}
        <nav className="navbar-links">
          {accessToken && (
            <>
              <Link to="/play"   className={isActive('/play')}>Play</Link>
              <Link to="/puzzle" className={isActive('/puzzle')}>Puzzles</Link>
            </>
          )}
        </nav>

        {/* Desktop right */}
        <div className="navbar-right navbar-right--desktop">
          {accessToken ? (
            <>
              <Link to={`/profile/${user?.id}`} className="nav-user">
                <span className="nav-username">{user?.username}</span>
                <span className="nav-rating">{user?.rating ?? 1200}</span>
              </Link>
              <Link to="/settings" className="nav-link">Settings</Link>
              <button className="btn btn-ghost btn-sm" onClick={logout}>Log out</button>
            </>
          ) : (
            <>
              <Link to="/login"    className="btn btn-ghost btn-sm">Log in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className={`hamburger ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span /><span /><span />
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="mobile-menu">
          {accessToken && (
            <>
              <Link to="/play"   className="mobile-link" onClick={closeMenu}>Play</Link>
              <Link to="/puzzle" className="mobile-link" onClick={closeMenu}>Puzzles</Link>
              <Link to={`/profile/${user?.id}`} className="mobile-link" onClick={closeMenu}>
                {user?.username} <span className="nav-rating">{user?.rating ?? 1200}</span>
              </Link>
              <Link to="/settings" className="mobile-link" onClick={closeMenu}>Settings</Link>
              <button className="mobile-link mobile-link--btn" onClick={() => { logout(); closeMenu(); }}>
                Log out
              </button>
            </>
          )}
          {!accessToken && (
            <>
              <Link to="/login"    className="mobile-link" onClick={closeMenu}>Log in</Link>
              <Link to="/register" className="mobile-link mobile-link--accent" onClick={closeMenu}>Register</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
