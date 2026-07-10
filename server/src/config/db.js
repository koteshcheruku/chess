const { Pool } = require('pg');

const config = {
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

if (process.env.NODE_ENV === 'production') {
  config.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(config);

pool.on('error', (err) => {
  console.error('Unexpected DB client error:', err);
});

/**
 * Execute a parameterized query.
 * @param {string} text - SQL query
 * @param {Array} params - query parameters
 */
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[DB] ${duration}ms | ${text.substring(0, 60)}`);
  }
  return res;
}

module.exports = { query, pool };
