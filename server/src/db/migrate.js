require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { pool } = require('../config/db');

async function migrate() {
  console.log('Running database migrations...');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id           VARCHAR(36) PRIMARY KEY,
        username     VARCHAR(50) UNIQUE,
        email        VARCHAR(255) UNIQUE,
        password_hash VARCHAR(255),
        rating       INTEGER NOT NULL DEFAULT 1200,
        is_guest     BOOLEAN NOT NULL DEFAULT FALSE,
        guest_expires_at TIMESTAMPTZ,
        preferences  JSONB NOT NULL DEFAULT '{}',
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Sessions (refresh tokens)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id           VARCHAR(36) PRIMARY KEY,
        user_id      VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash   VARCHAR(255) NOT NULL,
        expires_at   TIMESTAMPTZ NOT NULL,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Games table
    await client.query(`
      CREATE TABLE IF NOT EXISTS games (
        id                   VARCHAR(36) PRIMARY KEY,
        white_id             VARCHAR(36) REFERENCES users(id),
        black_id             VARCHAR(36) REFERENCES users(id),
        time_control         VARCHAR(20) NOT NULL,
        increment            INTEGER NOT NULL DEFAULT 0,
        status               VARCHAR(20) NOT NULL DEFAULT 'waiting',
        result               VARCHAR(10),
        result_reason        VARCHAR(50),
        moves                JSONB NOT NULL DEFAULT '[]',
        final_fen            TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        white_rating_before  INTEGER,
        black_rating_before  INTEGER,
        white_rating_after   INTEGER,
        black_rating_after   INTEGER,
        is_bot_game          BOOLEAN NOT NULL DEFAULT FALSE,
        bot_elo              INTEGER,
        created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Puzzles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS puzzles (
        id          VARCHAR(36) PRIMARY KEY,
        lichess_id  VARCHAR(20) UNIQUE,
        fen         TEXT NOT NULL,
        moves       TEXT[] NOT NULL,
        rating      INTEGER NOT NULL,
        themes      TEXT[] NOT NULL DEFAULT '{}',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Puzzle attempts
    await client.query(`
      CREATE TABLE IF NOT EXISTS puzzle_attempts (
        id            VARCHAR(36) PRIMARY KEY,
        user_id       VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        puzzle_id     VARCHAR(36) NOT NULL REFERENCES puzzles(id),
        success       BOOLEAN NOT NULL,
        time_taken    INTEGER,
        rating_before INTEGER NOT NULL,
        rating_after  INTEGER NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_games_white ON games(white_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_games_black ON games(black_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_puzzles_rating ON puzzles(rating)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_attempts_user ON puzzle_attempts(user_id)`);

    await client.query('COMMIT');
    console.log('Migrations complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
