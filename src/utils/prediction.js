// Helper to compute prediction live in frontend
export const predictMatchLive = (home, away, stats) => {
    const sh = stats[home] || { att: 1, def: 1 };
    const sa = stats[away] || { att: 1, def: 1 };

    // Simple strength comparison
    const homeStrength = sh.att * sa.def * 1.15; // Home advantage
    const awayStrength = sa.att * sh.def;

    const totalStrength = homeStrength + awayStrength;
    const homeProb = homeStrength / totalStrength;

    // Simulate Poisson distribution for more variance (instead of just rounding mean)
    const getPoisson = (lambda) => {
        let L = Math.exp(-lambda);
        let p = 1.0;
        let k = 0;
        do {
            k++;
            p *= Math.random();
        } while (p > L);
        return k - 1;
    };

    // Calculate Lambda (Expected Goals)
    const lambdaH = homeStrength * 1.35;
    const lambdaA = awayStrength * 1.05;

    // Generate score based on Poisson (introduces 0-0, 3-0, 4-1 etc.)
    let scoreH = getPoisson(lambdaH);
    let scoreA = getPoisson(lambdaA);

    let winner = "Match Nul";
    let conf = 50;

    // Re-evaluate probabilities based on the SIMULATED score vs THEORETICAL strength
    // This allows disjointed "upset" predictions if we wanted, but let's stick to strength for confidence to be safe
    // However, if the simulated score is 3-0, we should probably predict Home Win even if prob was 51%.

    if (scoreH > scoreA) {
        winner = home;
        conf = Math.min(95, Math.round(50 + (scoreH - scoreA) * 10 + (homeProb - 0.5) * 40));
    } else if (scoreA > scoreH) {
        winner = away;
        conf = Math.min(95, Math.round(50 + (scoreA - scoreH) * 10 + (0.5 - homeProb) * 40));
    } else {
        winner = "Match Nul";
        conf = Math.round((1 - Math.abs(homeProb - 0.5) * 2) * 60);
    }

    return {
        winner,
        score: `${scoreH}-${scoreA}`,
        winner_conf: conf, // Add explicit winner_conf for consistency with JSON
        confidence: conf,
        goals_pred: (scoreH + scoreA) > 2 ? "+2.5 Buts" : "-2.5 Buts", // Dynamic goals pred
        goals_conf: Math.min(90, 50 + Math.abs((scoreH + scoreA) - 2.5) * 20),
        advice: conf > 70 ? `Victoire ${winner}` : "Pari risqué (Nul ou BTTS)"
    };
};
