/**
 * Simulates the rest of the season based on current standings and remaining schedule.
 * Only works if 'schedule' contains future matches with 'prediction' data.
 */
export const simulateSeason = (currentStandings, schedule) => {
    if (!currentStandings || !schedule) return currentStandings;

    // Deep copy to avoid mutating props
    let simulatedStandings = JSON.parse(JSON.stringify(currentStandings));

    // Create a map for fast lookup
    let teamMap = {};
    simulatedStandings.forEach(t => teamMap[t.name] = t);

    // Filter future matches
    // We assume matches with status 'SCHEDULED' need to be simulated
    const futureMatches = schedule.filter(m => m.status === 'SCHEDULED' && m.prediction);

    futureMatches.forEach(match => {
        const home = teamMap[match.homeTeam];
        const away = teamMap[match.awayTeam];

        if (home && away && match.prediction) {
            // Apply predicted points
            // Logic: 
            // - If winner == home: home +3
            // - If winner == away: away +3
            // - If winner == Draw/Nul: both +1

            const predictedWinner = match.prediction.winner; // "Marseille", "Draw", etc. OR match.homeTeam name

            if (predictedWinner === match.homeTeam) {
                home.points += 3;
            } else if (predictedWinner === match.awayTeam) {
                away.points += 3;
            } else {
                // Draw
                home.points += 1;
                away.points += 1;
            }

            // Increment played count
            home.played += 1;
            away.played += 1;

            // Goal Diff simulation (simplified from score prediction)
            // predicted score format "1-0"
            if (match.prediction.score) {
                const parts = match.prediction.score.split('-');
                if (parts.length === 2) {
                    const hg = parseInt(parts[0]);
                    const ag = parseInt(parts[1]);
                    home.goalDiff += (hg - ag);
                    away.goalDiff += (ag - hg);
                }
            }
        }
    });

    // Re-sort standings
    simulatedStandings.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return b.goalDiff - a.goalDiff;
    });

    return simulatedStandings;
};
