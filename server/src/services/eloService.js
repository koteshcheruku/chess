/**
 * Standard ELO rating calculation.
 * K-factor: 40 for new players (<30 games), 20 for established.
 */

const K_NEW = 40;
const K_ESTABLISHED = 20;

/**
 * Calculate new ratings after a game result.
 * @param {number} ratingA
 * @param {number} ratingB
 * @param {'1-0'|'0-1'|'1/2-1/2'} result - from white's perspective
 * @param {number} gamesPlayedA - number of games A has played
 * @param {number} gamesPlayedB
 * @returns {{ newRatingA: number, newRatingB: number, deltaA: number, deltaB: number }}
 */
function calculateElo(ratingA, ratingB, result, gamesPlayedA = 30, gamesPlayedB = 30) {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 - expectedA;

  let scoreA, scoreB;
  if (result === '1-0') {
    scoreA = 1; scoreB = 0;
  } else if (result === '0-1') {
    scoreA = 0; scoreB = 1;
  } else {
    scoreA = 0.5; scoreB = 0.5;
  }

  const kA = gamesPlayedA < 30 ? K_NEW : K_ESTABLISHED;
  const kB = gamesPlayedB < 30 ? K_NEW : K_ESTABLISHED;

  const deltaA = Math.round(kA * (scoreA - expectedA));
  const deltaB = Math.round(kB * (scoreB - expectedB));

  return {
    newRatingA: Math.max(100, ratingA + deltaA),
    newRatingB: Math.max(100, ratingB + deltaB),
    deltaA,
    deltaB,
  };
}

/**
 * Calculate puzzle rating change.
 * @param {number} userRating
 * @param {number} puzzleRating
 * @param {boolean} solved
 */
function calculatePuzzleElo(userRating, puzzleRating, solved) {
  const expected = 1 / (1 + Math.pow(10, (puzzleRating - userRating) / 400));
  const score = solved ? 1 : 0;
  const delta = Math.round(20 * (score - expected));
  return {
    delta,
    newRating: Math.max(100, userRating + delta),
  };
}

module.exports = { calculateElo, calculatePuzzleElo };
