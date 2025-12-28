/**
 * Utility to generate backfilled prediction history for past matchdays.
 * Simulates "realistic" predictions based on match outcomes with some randomness/error.
 */

export const generateBackfillHistory = (schedule) => {
    const snapshots = [];

    // Determine the range of weeks to backfill (e.g., J1 to J15)
    // We assume current week (in reality) is 16, so we backfill up to 15.
    const maxWeek = 15;
    // const finalWeek = 34; // Ligue 1 has 34 weeks usually (current format 18 clubs)

    for (let currentWeek = 1; currentWeek <= maxWeek; currentWeek++) {

        const predictions = {};

        // We generate predictions for the current week AND future weeks.
        // This allows "Source J1" to be compared against "Target J15".

        // Filter matches that are "current or future" relative to this snapshot
        const relevantMatches = schedule.filter(m => m.week >= currentWeek);

        relevantMatches.forEach(match => {
            // Generate a prediction

            // If the match is actually finished in reality, we can base our "prediction" on the result
            // to simulate varying degrees of accuracy.
            // If the match is NOT finished (future relative to REALITY, not just snapshot), 
            // we should probably not generate a "backfill" prediction or just random?
            // Since we are backfilling J1-J15, and real time is >J15, most matches J1-J15 are finished.
            // Matches J16+ might be finished or not depending on data.

            let predHome, predAway;
            let predWinner = 'Draw';
            let confidence = 50;

            if (match.status === 'FINISHED') {
                const realHomeScore = match.score.home;
                const realAwayScore = match.score.away;

                let realWinnerResult = 'draw';
                if (realHomeScore > realAwayScore) realWinnerResult = 'home';
                else if (realAwayScore > realHomeScore) realWinnerResult = 'away';

                // Simulation Logic:
                // If match week is close to currentWeek, accuracy is higher?
                // Or just standard simulation.

                const isWinnerCorrect = Math.random() < 0.55; // 55% accuracy overall basis

                if (isWinnerCorrect) {
                    // Correct outcome
                    if (realWinnerResult === 'home') {
                        predHome = Math.max(1, realHomeScore + (Math.random() > 0.7 ? 0 : (Math.random() > 0.5 ? 1 : -1)));
                        predAway = Math.max(0, realAwayScore + (Math.random() > 0.7 ? 0 : (Math.random() > 0.5 ? 1 : -1)));
                        if (predHome <= predAway) predHome = predAway + 1; // Force win
                    } else if (realWinnerResult === 'away') {
                        predAway = Math.max(1, realAwayScore + (Math.random() > 0.7 ? 0 : (Math.random() > 0.5 ? 1 : -1)));
                        predHome = Math.max(0, realHomeScore + (Math.random() > 0.7 ? 0 : (Math.random() > 0.5 ? 1 : -1)));
                        if (predAway <= predHome) predAway = predHome + 1; // Force win
                    } else {
                        const drawScore = Math.floor(Math.random() * 2) + 1; // 1-1 or 2-2 usually
                        predHome = drawScore;
                        predAway = drawScore;
                    }
                } else {
                    // Wrong outcome
                    if (realWinnerResult === 'home') {
                        // Predict Away or Draw
                        predHome = 0; predAway = 1;
                    } else if (realWinnerResult === 'away') {
                        predHome = 1; predAway = 0;
                    } else {
                        // Was draw, predict winner
                        predHome = 1; predAway = 0;
                    }
                }
            } else {
                // Match not played yet in reality (e.g. J17+)
                // Random prediction
                predHome = Math.floor(Math.random() * 3);
                predAway = Math.floor(Math.random() * 3);
            }

            // Determine winner string
            if (predHome > predAway) predWinner = match.homeTeam;
            else if (predAway > predHome) predWinner = match.awayTeam;

            // Confidence
            confidence = Math.floor(Math.random() * 30) + 40;

            predictions[match.id] = {
                score: `${predHome}-${predAway}`,
                winner: predWinner,
                goals_pred: (predHome + predAway) > 2.5 ? "+2.5 Buts" : "-2.5 Buts",
                confidence: confidence,
                week: match.week
            };
        });

        // Create Snapshot
        snapshots.push({
            id: `backfill_w${currentWeek}_global`,
            label: `J${currentWeek} (Simulation)`,
            week: currentWeek,
            date: new Date(2024, 7 + (currentWeek * 0.25), 1).toISOString(),
            predictions: predictions
        });
    }

    return snapshots;
};
