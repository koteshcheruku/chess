import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Page.css';

export default function ErrorPage({ type }) {
  const navigate = useNavigate();

  let title = 'Something went wrong';
  let description = 'We encountered an unexpected error.';
  let icon = '⚠️';

  if (type === '401') {
    title = 'Unauthorized';
    description = 'You must be logged in to access this page.';
    icon = '🔒';
  } else if (type === '403') {
    title = 'Forbidden';
    description = 'You do not have permission to perform this action. Guests cannot access this feature.';
    icon = '🚫';
  } else if (type === '404') {
    title = 'Page Not Found';
    description = 'The page you are looking for does not exist or has been moved.';
    icon = '🔍';
  }

  return (
    <main className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card text-center" style={{ maxWidth: '400px', width: '100%', padding: 'var(--space-6)' }}>
        <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>{icon}</div>
        <h1 style={{ marginBottom: 'var(--space-2)' }}>{title}</h1>
        <p className="text-muted" style={{ marginBottom: 'var(--space-4)' }}>{description}</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Back to Home
        </button>
      </div>
    </main>
  );
}
