// Helper to compute prediction live in frontend
// Now includes Deterministic Randomness (Seeded) for consistency
export const predictMatchLive = (home, away, stats) => {
    const sh = stats[home] || { att: 1, def: 1 };
    const sa = stats[away] || { att: 1, def: 1 };

    // Simple strength comparison
    const homeStrength = sh.att * sa.def * 1.15; // Home advantage
    const awayStrength = sa.att * sh.def;

    const totalStrength = homeStrength + awayStrength;
    const homeProb = homeStrength / totalStrength;

    // SEEDED RANDOM GENERATOR (LCG)
    // Seed based on team names to ensure consistency for the same match-up
    let seed = home.split('').reduce((a, b) => a + b.charCodeAt(0), 0) +
        away.split('').reduce((a, b) => a + b.charCodeAt(0), 0);

    const seededRandom = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };

    // Simulate Poisson distribution
    const getPoisson = (lambda) => {
        let L = Math.exp(-lambda);
        let p = 1.0;
        let k = 0;
        do {
            k++;
            p *= seededRandom(); // Use seeded random
        } while (p > L);
        return k - 1;
    };

    // Calculate Lambda (Expected Goals)
    const lambdaH = homeStrength * 1.35;
    const lambdaA = awayStrength * 1.05;

    // MONTE CARLO SIMULATION (500 rounds) to find the "Mode" (Most frequent outcome)
    const ITERATIONS = 500;
    const scoreCounts = {};
    let winnerCounts = { home: 0, draw: 0, away: 0 };
    let over25Count = 0;

    for (let i = 0; i < ITERATIONS; i++) {
        const sH = getPoisson(lambdaH);
        const sA = getPoisson(lambdaA);
        const key = `${sH}-${sA}`;

        scoreCounts[key] = (scoreCounts[key] || 0) + 1;

        if (sH > sA) winnerCounts.home++;
        else if (sA > sH) winnerCounts.away++;
        else winnerCounts.draw++;

        if (sH + sA > 2.5) over25Count++;
    }

    // Determine Mode Score
    let bestScore = "0-0";
    let maxCount = 0;
    for (const [score, count] of Object.entries(scoreCounts)) {
        if (count > maxCount) {
            maxCount = count;
            bestScore = score;
        }
    }
    const [finalH, finalA] = bestScore.split('-').map(Number);
    const scoreConf = Math.round((maxCount / ITERATIONS) * 100);

    // Determine Winner based on frequencies
    let winner = "Match Nul";
    let winnerKey = "draw";
    let maxWinCount = winnerCounts.draw;

    if (winnerCounts.home > maxWinCount) {
        winnerKey = 'home';
        maxWinCount = winnerCounts.home;
    }
    if (winnerCounts.away > maxWinCount) {
        winnerKey = 'away';
        maxWinCount = winnerCounts.away;
    }

    if (winnerKey === 'home') winner = home;
    if (winnerKey === 'away') winner = away;

    const winnerConf = Math.round((maxWinCount / ITERATIONS) * 100);

    // Determine Goals
    const probOver25 = over25Count / ITERATIONS;
    const goalsPred = probOver25 > 0.5 ? "+2.5 Buts" : "-2.5 Buts";
    const goalsConf = Math.round((probOver25 > 0.5 ? probOver25 : 1 - probOver25) * 100);

    const advice = winnerConf > 60 ? `Victoire ${winner}` : "Pari risqué (Nul ou BTTS)";

    return {
        winner,
        score: bestScore,
        winner_conf: winnerConf,
        confidence: winnerConf,
        goals_pred: goalsPred,
        goals_conf: goalsConf,
        advice
    };
};
