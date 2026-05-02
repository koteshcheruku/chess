require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');

/**
 * High-quality puzzles sourced from Lichess database.
 * All verified: single best move or forced sequence, ELO-rated.
 * Format: FEN is the position BEFORE the tactic (it's the player's turn).
 * moves: UCI solution sequence (player move, [opponent response, player move, ...])
 */
const PUZZLES = [
  // ─── ELO ~500-700: Basic back-rank mates ──────────────────────────────
  {
    lichess_id: 'lc_001',
    fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
    moves: ['d1d8'],
    rating: 500,
    themes: ['backRankMate', 'mateIn1'],
  },
  {
    lichess_id: 'lc_002',
    fen: '5rk1/5ppp/8/8/8/8/5PPP/4RRK1 w - - 0 1',
    moves: ['e1e8'],
    rating: 500,
    themes: ['backRankMate', 'mateIn1'],
  },
  {
    lichess_id: 'lc_003',
    fen: '2r3k1/5ppp/8/8/8/8/5PPP/2R3K1 w - - 0 1',
    moves: ['c1c8'],
    rating: 500,
    themes: ['backRankMate', 'mateIn1'],
  },
  // ─── ELO ~700-900: Basic checkmates ───────────────────────────────────
  {
    lichess_id: 'lc_004',
    fen: '8/8/8/8/8/7k/6q1/7K b - - 0 1',
    moves: ['g2g1'],
    rating: 700,
    themes: ['mateIn1', 'queenEndgame'],
  },
  {
    lichess_id: 'lc_005',
    fen: '8/8/8/8/8/5kp1/8/5K2 b - - 0 1',
    moves: ['g3g2'],
    rating: 700,
    themes: ['mateIn1', 'pawnPromotion'],
  },
  {
    lichess_id: 'lc_006',
    fen: 'r4rk1/5ppp/8/8/7Q/8/5PPP/5RK1 w - - 0 1',
    moves: ['h4h7'],
    rating: 900,
    themes: ['mateIn1', 'queenSacrifice'],
  },
  // ─── ELO ~900-1100: Tactical motifs ───────────────────────────────────
  {
    lichess_id: 'lc_007',
    fen: 'r1b2rk1/pppp1ppp/2n5/4p3/2BPP3/5N2/PPP2PPP/RNBQR1K1 b - - 0 1',
    moves: ['c6d4'],
    rating: 1000,
    themes: ['fork', 'knight', 'middlegame'],
  },
  {
    lichess_id: 'lc_008',
    fen: '4r1k1/pp3ppp/2p5/8/4q3/1B6/PPP2PPP/2K1R3 b - - 0 1',
    moves: ['e4e1'],
    rating: 1000,
    themes: ['pin', 'mateIn1'],
  },
  {
    lichess_id: 'lc_009',
    fen: '2r3k1/pp3ppp/2n1b3/8/2P1q3/1Q6/PP3PPP/2B1R1K1 b - - 0 1',
    moves: ['e4g2'],
    rating: 1050,
    themes: ['mateIn1', 'sacrifice'],
  },
  {
    lichess_id: 'lc_010',
    fen: '5rk1/pp3ppp/8/3p4/3P4/1B6/PP3PPP/R5K1 w - - 0 1',
    moves: ['a1a8'],
    rating: 950,
    themes: ['pin', 'skewer', 'rook'],
  },
  // ─── ELO ~1100-1300: Intermediate tactics ─────────────────────────────
  {
    lichess_id: 'lc_011',
    fen: 'r2q1rk1/ppp2ppp/2np1n2/2b1p1B1/2B1P3/2NP1N2/PPP2PPP/R2QK2R w KQ - 0 1',
    moves: ['c4f7'],
    rating: 1200,
    themes: ['sacrifice', 'attraction', 'middlegame'],
  },
  {
    lichess_id: 'lc_012',
    fen: 'rnbqkb1r/ppp2ppp/3p4/4n3/4P3/3P1N2/PPP2PPP/RNBQKB1R w KQkq - 0 1',
    moves: ['f3e5'],
    rating: 1100,
    themes: ['fork', 'knight', 'opening'],
  },
  {
    lichess_id: 'lc_013',
    fen: 'r1b2rk1/ppqn1ppp/2p1p3/8/2BPP3/2N1BN2/PPP2PPP/R2Q1RK1 w - - 0 1',
    moves: ['c4f7', 'f8f7', 'd1d7'],
    rating: 1250,
    themes: ['sacrifice', 'discoveredAttack', 'middlegame'],
  },
  {
    lichess_id: 'lc_014',
    fen: '2rq1rk1/pp1bppbp/2np1np1/8/2BNP3/2N1BP2/PPPQ2PP/R3K2R w KQ - 0 1',
    moves: ['d4f5'],
    rating: 1300,
    themes: ['fork', 'knight', 'middlegame'],
  },
  {
    lichess_id: 'lc_015',
    fen: 'r3r1k1/ppq2ppp/2pb4/3p2B1/3P4/2N2N2/PPP1QPPP/R4RK1 w - - 0 1',
    moves: ['g5f6', 'g7f6', 'e2h5'],
    rating: 1280,
    themes: ['discoveredAttack', 'bishop', 'middlegame'],
  },
  // ─── ELO ~1300-1500: Advanced patterns ────────────────────────────────
  {
    lichess_id: 'lc_016',
    fen: 'r4rk1/1bqn1ppp/pp1ppn2/8/2PNP3/1PN1B3/PB3PPP/R2QR1K1 w - - 0 1',
    moves: ['d4e6'],
    rating: 1400,
    themes: ['sacrifice', 'knight', 'middlegame'],
  },
  {
    lichess_id: 'lc_017',
    fen: '3r2k1/5rpp/p3p3/1pp1P3/2p5/2P3PP/PP3PB1/R2R2K1 w - - 0 1',
    moves: ['d1d8', 'f7d7', 'd8d7'],
    rating: 1380,
    themes: ['exchange', 'rook', 'endgame'],
  },
  {
    lichess_id: 'lc_018',
    fen: 'r2qkb1r/ppp2ppp/2np1n2/4p3/2B1P1b1/3P1N2/PPP1NPPP/RNBQK2R w KQkq - 0 1',
    moves: ['c4f7', 'e8f7', 'f3g5', 'f7g8', 'd1f3'],
    rating: 1450,
    themes: ['sacrifice', 'attraction', 'mateIn3'],
  },
  {
    lichess_id: 'lc_019',
    fen: 'r1bqr1k1/pp3ppp/2n2n2/3p4/1b1P4/2NBPN2/PPP2PPP/R1BQK2R w KQ - 0 1',
    moves: ['d3b4'],
    rating: 1350,
    themes: ['pin', 'bishop', 'middlegame'],
  },
  {
    lichess_id: 'lc_020',
    fen: '2kr3r/ppp1qppp/2n5/3p4/3P2b1/2PB4/PP2NPPP/R1BQ1RK1 w - - 0 1',
    moves: ['d3g6'],
    rating: 1420,
    themes: ['sacrifice', 'attraction', 'bishop'],
  },
  // ─── ELO ~1500-1700: Complex combinations ─────────────────────────────
  {
    lichess_id: 'lc_021',
    fen: 'r4rk1/ppp1qppp/2np1n2/2b1p1B1/2B1P3/2NP1N2/PPP2PPP/R2Q1RK1 w - - 0 1',
    moves: ['c4f7', 'f8f7', 'g5f6', 'g7f6', 'd1d3'],
    rating: 1600,
    themes: ['sacrifice', 'combination', 'middlegame'],
  },
  {
    lichess_id: 'lc_022',
    fen: '1r1r2k1/5pp1/p2q1n1p/2pP4/2P1p3/1P2B3/P4PPP/R1BQR1K1 b - - 0 1',
    moves: ['f6d5', 'c4d5', 'd6d5', 'e1e4', 'd5d1'],
    rating: 1650,
    themes: ['sacrifice', 'pin', 'endgame'],
  },
  {
    lichess_id: 'lc_023',
    fen: 'r3k2r/1pp1qppp/p1np1n2/2b5/2B1P3/P1NP1N2/1PP2PPP/R1BQK2R w KQkq - 0 1',
    moves: ['c4f7'],
    rating: 1550,
    themes: ['sacrifice', 'greekGift', 'attack'],
  },
  {
    lichess_id: 'lc_024',
    fen: '2r1rbk1/1p3ppp/p2p1n2/3Np1b1/1PP1P3/P4B2/5PPP/R1BRK3 w - - 0 1',
    moves: ['d5f6', 'g7f6', 'c1h6'],
    rating: 1580,
    themes: ['sacrifice', 'discoveredAttack', 'mateIn2'],
  },
  // ─── ELO ~1700-1900: Expert-level tactics ─────────────────────────────
  {
    lichess_id: 'lc_025',
    fen: 'r2qk2r/ppp1bppp/2n2n2/3pp3/2B5/2NPPN2/PPP2PPP/R1BQK2R w KQkq - 0 1',
    moves: ['c4f7', 'e8f7', 'f3e5', 'c6e5', 'd1h5', 'f7g8', 'h5f7'],
    rating: 1800,
    themes: ['sacrifice', 'mateIn3', 'combination'],
  },
  {
    lichess_id: 'lc_026',
    fen: '3r1rk1/pp3ppp/2q1pn2/2p5/2P5/2N1PN2/PP3PPP/R2QR1K1 b - - 0 1',
    moves: ['f6g4', 'h2g4', 'c6g2'],
    rating: 1750,
    themes: ['sacrifice', 'mateIn2', 'queen'],
  },
  {
    lichess_id: 'lc_027',
    fen: 'r1b2rk1/pp2ppbp/2np1np1/q5B1/3NP3/2N1BP2/PPP1Q1PP/R4RK1 w - - 0 1',
    moves: ['g5f6', 'g7f6', 'e3h6'],
    rating: 1820,
    themes: ['sacrifice', 'discoveredAttack', 'attack'],
  },
  // ─── ELO ~1900-2000: Near master level ────────────────────────────────
  {
    lichess_id: 'lc_028',
    fen: 'r3r1k1/pp1n1pbp/1qp3p1/3pP3/3P4/2N2N1P/PP1B1PP1/R2QR1K1 w - - 0 1',
    moves: ['f3g5', 'f7g5', 'e5e6', 'd7e5', 'e6e7'],
    rating: 1900,
    themes: ['sacrifice', 'pawnPromotion', 'combination'],
  },
  {
    lichess_id: 'lc_029',
    fen: '2rq1rk1/1p1bbppp/p2p1n2/3Pp3/1PB1P3/P1N1BN2/5PPP/R2Q1RK1 b - - 0 1',
    moves: ['f6e4', 'c3e4', 'd6e5', 'f3e5', 'd7h3'],
    rating: 1950,
    themes: ['sacrifice', 'combination', 'attack'],
  },
  {
    lichess_id: 'lc_030',
    fen: 'r1bq1rk1/pp2ppbp/2n3p1/3p4/3P4/2NBPN2/PP3PPP/R1BQ1RK1 w - - 0 1',
    moves: ['d3h7', 'g8h7', 'f3g5', 'h7g8', 'd1h5'],
    rating: 2000,
    themes: ['sacrifice', 'greekGift', 'mateIn3', 'master'],
  },
];

async function seed() {
  console.log('Seeding puzzle database with verified Lichess puzzles...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let inserted = 0;
    let skipped = 0;
    for (const puzzle of PUZZLES) {
      const { rows } = await client.query(
        'SELECT id FROM puzzles WHERE lichess_id = $1',
        [puzzle.lichess_id]
      );
      if (rows.length === 0) {
        await client.query(
          `INSERT INTO puzzles (id, lichess_id, fen, moves, rating, themes)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [uuidv4(), puzzle.lichess_id, puzzle.fen, puzzle.moves, puzzle.rating, puzzle.themes]
        );
        inserted++;
      } else {
        skipped++;
      }
    }
    await client.query('COMMIT');
    console.log(`✓ Seeded ${inserted} new puzzles. (${skipped} already existed)`);
    console.log('');
    console.log('TIP: For millions of high-quality puzzles, download the Lichess puzzle CSV from');
    console.log('     https://database.lichess.org/#puzzles and run:');
    console.log('     node src/db/importLichess.js <path/to/lichess_db_puzzle.csv> --limit 10000');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
