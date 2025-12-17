// Helper to compute prediction live in frontend
export const predictMatchLive = (home, away, stats) => {
    const sh = stats[home] || { att: 1, def: 1 };
    const sa = stats[away] || { att: 1, def: 1 };

    // Simple strength comparison
    const homeStrength = sh.att * sa.def * 1.15; // Home advantage
    const awayStrength = sa.att * sh.def;

    const totalStrength = homeStrength + awayStrength;
    const homeProb = homeStrength / totalStrength;

    let scoreH = Math.round(homeStrength * 1.5);
    let scoreA = Math.round(awayStrength * 1.2);

    let winner = "Match Nul";
    let conf = 50;

    if (homeProb > 0.55) {
        winner = home;
        conf = Math.min(95, Math.round(homeProb * 100));
    } else if (homeProb < 0.45) {
        winner = away;
        conf = Math.min(95, Math.round((1 - homeProb) * 100));
    } else {
        conf = Math.round((1 - Math.abs(homeProb - 0.5) * 2) * 60);
    }

    return {
        winner,
        score: `${scoreH}-${scoreA}`,
        confidence: conf,
        advice: conf > 70 ? `Victoire ${winner}` : "Pari risqué (Nul ou BTTS)"
    };
};
