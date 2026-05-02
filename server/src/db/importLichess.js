/**
 * Lichess Puzzle CSV Importer
 * 
 * Downloads and imports puzzles from the Lichess open database.
 * 
 * Usage:
 *   node src/db/importLichess.js <path/to/lichess_db_puzzle.csv> [options]
 * 
 * Options:
 *   --limit <N>       Max puzzles to import (default: 5000)
 *   --min-rating <N>  Minimum puzzle rating (default: 400)
 *   --max-rating <N>  Maximum puzzle rating (default: 2500)
 *   --batch <N>       DB insert batch size (default: 100)
 * 
 * Download the CSV from: https://database.lichess.org/#puzzles
 * The CSV has columns:
 *   PuzzleId, FEN, Moves, Rating, RatingDeviation, Popularity, NbPlays,
 *   Themes, GameUrl, OpeningTags
 * 
 * Example:
 *   node src/db/importLichess.js ./lichess_db_puzzle_202401.csv --limit 10000 --min-rating 800 --max-rating 1800
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const fs   = require('fs');
const path = require('path');
const readline = require('readline');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');

// ─── Parse CLI args ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const csvPath  = args.find((a) => !a.startsWith('--'));
const getArg   = (flag, def) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? parseInt(args[idx + 1], 10) : def;
};

const LIMIT      = getArg('--limit', 5000);
const MIN_RATING = getArg('--min-rating', 400);
const MAX_RATING = getArg('--max-rating', 2500);
const BATCH_SIZE = getArg('--batch', 100);

if (!csvPath || !fs.existsSync(csvPath)) {
  console.error('Error: CSV file not found.');
  console.error('Usage: node src/db/importLichess.js <path/to/lichess_db_puzzle.csv>');
  console.error('Download CSV: https://database.lichess.org/#puzzles');
  process.exit(1);
}

// ─── CSV header indices ────────────────────────────────────────────────────
const COL = {
  PuzzleId:        0,
  FEN:             1,
  Moves:           2,
  Rating:          3,
  RatingDeviation: 4,
  Popularity:      5,
  NbPlays:         6,
  Themes:          7,
  GameUrl:         8,
  OpeningTags:     9,
};

function parseLine(line) {
  const cols = line.split(',');
  if (cols.length < 8) return null;

  const rating = parseInt(cols[COL.Rating], 10);
  if (isNaN(rating) || rating < MIN_RATING || rating > MAX_RATING) return null;

  const moves = cols[COL.Moves].trim().split(' ').filter(Boolean);
  if (moves.length === 0) return null;

  const themes = cols[COL.Themes]
    ? cols[COL.Themes].trim().split(' ').filter(Boolean)
    : [];

  return {
    lichess_id: `lichess_${cols[COL.PuzzleId].trim()}`,
    fen:    cols[COL.FEN].trim(),
    moves,
    rating,
    themes,
  };
}

// ─── Main import ───────────────────────────────────────────────────────────
async function importPuzzles() {
  console.log(`Importing up to ${LIMIT} puzzles from: ${csvPath}`);
  console.log(`Rating range: ${MIN_RATING}–${MAX_RATING}`);
  console.log('');

  const client = await pool.connect();
  let imported = 0;
  let skipped  = 0;
  let invalid  = 0;
  let batch    = [];

  // Fetch existing lichess_ids to avoid duplicates
  const { rows: existing } = await client.query('SELECT lichess_id FROM puzzles WHERE lichess_id LIKE \'lichess_%\'');
  const existingIds = new Set(existing.map((r) => r.lichess_id));
  console.log(`Found ${existingIds.size} existing Lichess puzzles in DB. Skipping those.`);

  const rl = readline.createInterface({
    input: fs.createReadStream(csvPath),
    crlfDelay: Infinity,
  });

  let headerSkipped = false;

  async function flushBatch() {
    if (batch.length === 0) return;
    try {
      await client.query('BEGIN');
      for (const p of batch) {
        await client.query(
          `INSERT INTO puzzles (id, lichess_id, fen, moves, rating, themes)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (lichess_id) DO NOTHING`,
          [uuidv4(), p.lichess_id, p.fen, p.moves, p.rating, p.themes]
        );
        imported++;
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Batch insert failed:', err.message);
    }
    batch = [];
  }

  for await (const line of rl) {
    if (!headerSkipped) { headerSkipped = true; continue; } // skip CSV header row
    if (imported >= LIMIT) break;

    const puzzle = parseLine(line);
    if (!puzzle) { invalid++; continue; }
    if (existingIds.has(puzzle.lichess_id)) { skipped++; continue; }

    batch.push(puzzle);
    if (batch.length >= BATCH_SIZE) {
      await flushBatch();
      process.stdout.write(`\r  Imported: ${imported} | Skipped: ${skipped} | Invalid: ${invalid}`);
    }
  }

  // Flush remaining
  await flushBatch();

  console.log(`\n\n✓ Import complete!`);
  console.log(`  Imported : ${imported} puzzles`);
  console.log(`  Skipped  : ${skipped} (already existed)`);
  console.log(`  Invalid  : ${invalid} (wrong format / out of rating range)`);

  client.release();
  await pool.end();
}

importPuzzles().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
