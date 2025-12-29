
/**
 * Calculates calibration factors based on finished matches prediction accuracy.
 * 
 * @param {Array} schedule - Full schedule containing finished matches
 * @param {Object} teamStats - Base team stats
 * @returns {Object} calibration - { "PSG": { attack: 1.1, defense: 0.9 }, ... }
 */
export const calculateCalibration = (schedule, teamStats) => {
    const calibration = {};
    const teamData = {}; // { PSG: { predG: 0, realG: 0, predGA: 0, realGA: 0, games: 0 } }

    // Initialize stats
    schedule.forEach(m => {
        if (!teamData[m.homeTeam]) teamData[m.homeTeam] = { predG: 0, realG: 0, predGA: 0, realGA: 0, games: 0 };
        if (!teamData[m.awayTeam]) teamData[m.awayTeam] = { predG: 0, realG: 0, predGA: 0, realGA: 0, games: 0 };
    });

    // Process FINISHED matches where we have a prediction (or could infer one)
    schedule.forEach(match => {
        if (match.status === 'FINISHED' && match.score && match.prediction) {
            const [realH, realA] = [match.score.home, match.score.away];

            // Parse existing prediction if available (or use base stats if not stored)
            // Assuming match.prediction exists for past matches (it should if we backfilled/simulated)
            let predH = 0, predA = 0;
            if (match.prediction.score) {
                const parts = match.prediction.score.split('-');
                predH = parseInt(parts[0]);
                predA = parseInt(parts[1]);
            }

            // Accumulate Home Team
            if (teamData[match.homeTeam]) {
                teamData[match.homeTeam].predG += predH;
                teamData[match.homeTeam].realG += realH;
                teamData[match.homeTeam].predGA += predA;
                teamData[match.homeTeam].realGA += realA;
                teamData[match.homeTeam].games++;
            }

            // Accumulate Away Team
            if (teamData[match.awayTeam]) {
                teamData[match.awayTeam].predG += predA;
                teamData[match.awayTeam].realG += realA;
                teamData[match.awayTeam].predGA += predH;
                teamData[match.awayTeam].realGA += realH;
                teamData[match.awayTeam].games++;
            }
        }
    });

    // Compute Factors
    Object.keys(teamData).forEach(team => {
        const d = teamData[team];
        if (d.games >= 3) { // Min sample size to apply calibration
            // Avoid division by zero
            const attackFactor = d.predG > 0 ? (d.realG / d.predG) : 1.0;
            const defenseFactor = d.predGA > 0 ? (d.realGA / d.predGA) : 1.0;

            // Clamp factors to avoid extreme swings (e.g. 0.5 to 1.5)
            const clamp = (val) => Math.max(0.7, Math.min(1.3, val));

            calibration[team] = {
                attack: clamp(attackFactor),
                defense: clamp(defenseFactor)
            };
        } else {
            calibration[team] = { attack: 1.0, defense: 1.0 };
        }
    });

    return calibration;
};
