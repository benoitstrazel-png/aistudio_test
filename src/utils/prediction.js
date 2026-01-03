// Helper to compute prediction live in frontend
// Now includes Deterministic Randomness (Seeded) for consistency
export const predictMatchLive = (home, away, stats, calibration = {}) => {
    const sh = stats[home] || { att: 1, def: 1 };
    const sa = stats[away] || { att: 1, def: 1 };

    // Apply Calibration if available
    const calH = calibration[home] || { attack: 1, defense: 1 };
    const calA = calibration[away] || { attack: 1, defense: 1 };

    // Simple strength comparison with Calibration
    // Home Att * (Away Def * Away Def Factor)
    // We adjust the EFFECTIVE strength
    const effHomeAtt = sh.att * calH.attack;
    const effHomeDef = sh.def * calH.defense; // Lower is better for def usually? 
    // Wait, in this model: att * def. If def is "strength" (higher = better), then we multiply.
    // Let's assume stats.def is "Defensive Strength" (higher = allow fewer goals).
    // NO, usually in simple models: Att * (1/Def) or Att * Def_Weakness.
    // Let's check how 'stats' are built. Usually 1.2 att, 0.8 def (where 0.8 means allows 80% of avg).
    // IF stats.def < 1 means GOOD defense:
    // Then effHomeDef = sh.def * calH.defense. If Factor < 1 (was too pessimistic), we lower it further?
    // Let's stick to the multiplier logic found: homeStrength = sh.att * sa.def.
    // If sa.def is "Defense Weakness" (higher = worse), then:
    // If we predicted 2 goals but they took 1, our predGA was too high. Factor = 0.5.
    // We multiply sa.def * 0.5. Matches reality.

    const effAwayAtt = sa.att * calA.attack;
    const effAwayDef = sa.def * calA.defense;

    const homeStrength = effHomeAtt * effAwayDef * 1.15; // Home advantage
    const awayStrength = effAwayAtt * effHomeDef;

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
    // Adjusted multipliers to reduce goal inflation and allow 0-0 modes
    let lambdaH = homeStrength * 1.15;
    let lambdaA = awayStrength * 0.85;

    // Special "Tactical Lock" adjustment: 
    // If both teams are highly defensive (def strength < 0.95), lock the game
    if (effHomeDef < 0.95 && effAwayDef < 0.95) {
        lambdaH *= 0.75;
        lambdaA *= 0.75;
    }

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
