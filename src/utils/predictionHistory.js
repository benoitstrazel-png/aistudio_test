
/**
 * Utility to manage prediction history snapshots in localStorage.
 * 
 * Data Structure:
 * "prediction_snapshots": [
 *   {
 *     id: "week-16-timestamp",
 *     week: 16, // The "Current Week" when snapshot was taken
 *     date: "2025-12-28T...",
 *     predictions: {
 *       "match_id_1": { score: "1-0", winner: "Toulouse", week: 20 },
 *       ...
 *     }
 *   }
 * ]
 */

const STORAGE_KEY = 'aistudio_prediction_snapshots';

// Save current state of future predictions
export const savePredictionSnapshot = (currentWeek, fullSchedule) => {
    try {
        const snapshots = getSnapshots();

        // Filter only future matches or matches that have a prediction
        const predictions = {};
        fullSchedule.forEach(m => {
            // We store predictions for all matches effectively, 
            // assuming the 'prediction' field in match object is the forecast at this time.
            if (m.prediction) {
                predictions[m.id] = {
                    score: m.prediction.score,
                    winner: m.prediction.winner,
                    goals_pred: m.prediction.goals_pred,
                    confidence: m.prediction.confidence,
                    week: m.week
                };
            }
        });

        const newSnapshot = {
            id: `snapshot_w${currentWeek}_${Date.now()}`,
            label: `J${currentWeek} (${new Date().toLocaleDateString()})`,
            week: currentWeek,
            date: new Date().toISOString(),
            predictions: predictions
        };

        snapshots.push(newSnapshot);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
        console.log("Snapshot saved:", newSnapshot.id);
        return newSnapshot;
    } catch (e) {
        console.error("Failed to save snapshot", e);
        return null;
    }
};

export const getSnapshots = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
};

// Seed mock history for demonstration (J16 predictions for J20)
export const seedMockHistory = (schedule) => {
    const snapshots = getSnapshots();
    // Only seed if empty or check specific ID
    if (snapshots.some(s => s.id === 'mock_j16')) return;

    const mockPredictions = {};
    schedule.forEach(m => {
        // Create a "fake" prediction different from actual result sometimes
        const isCorrect = Math.random() > 0.4; // 60% accuracy simulation
        let mockScore = m.score ? `${m.score.home}-${m.score.away}` : "1-1";

        if (!isCorrect && m.status === 'FINISHED') {
            // Generate wrong score
            const [h, a] = (m.score?.home !== undefined ? [m.score.home, m.score.away] : [1, 1]);
            mockScore = `${a}-${h}`; // Flip result just for noise
        }

        // Ensure we have a prediction object structure
        mockPredictions[m.id] = {
            score: mockScore,
            winner: mockScore.split('-')[0] > mockScore.split('-')[1] ? m.homeTeam :
                (mockScore.split('-')[1] > mockScore.split('-')[0] ? m.awayTeam : 'Draw'),
            goals_pred: "+2.5 Buts",
            confidence: Math.floor(Math.random() * 40) + 40,
            week: m.week
        };
    });

    const mockSnapshot = {
        id: 'mock_j16',
        label: 'Simulation J16 (Mock)',
        week: 16,
        date: new Date(Date.now() - 86400000 * 30).toISOString(), // 30 days ago
        predictions: mockPredictions
    };

    snapshots.push(mockSnapshot);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
    console.log("Mock history seeded");
};

export const comparePredictions = (snapshotId, targetWeek, currentSchedule) => {
    const snapshots = getSnapshots();
    const source = snapshots.find(s => s.id === snapshotId);

    if (!source) return { metrics: {}, matches: [] };

    const matchesInTargetWeek = currentSchedule.filter(m => m.week === parseInt(targetWeek));
    const comparisonResults = [];

    let correctWinnerCount = 0;
    let exactScoreCount = 0;
    let totalFinished = 0;

    matchesInTargetWeek.forEach(realMatch => {
        const pred = source.predictions[realMatch.id];
        if (!pred) return; // No prediction in this snapshot for this match

        // Status
        const isFinished = realMatch.status === 'FINISHED';

        let resultStatus = 'pending'; // correct, wrong, pending
        let exactScore = false;

        if (isFinished) {
            totalFinished++;
            const realH = realMatch.score.home;
            const realA = realMatch.score.away;
            const realWinner = realH > realA ? 'home' : (realA > realH ? 'away' : 'draw');

            const [predH, predA] = pred.score.split('-').map(Number);
            const predWinner = predH > predA ? 'home' : (predA > predH ? 'away' : 'draw');

            if (realWinner === predWinner) {
                resultStatus = 'correct';
                correctWinnerCount++;
            } else {
                resultStatus = 'wrong';
            }

            if (realH === predH && realA === predA) {
                exactScore = true;
                exactScoreCount++;
            }
        }

        comparisonResults.push({
            match: realMatch,
            prediction: pred,
            status: resultStatus,
            exactScore: exactScore
        });
    });

    return {
        metrics: {
            accuracy: totalFinished > 0 ? Math.round((correctWinnerCount / totalFinished) * 100) : 0,
            exactAccuracy: totalFinished > 0 ? Math.round((exactScoreCount / totalFinished) * 100) : 0,
            total: totalFinished
        },
        matches: comparisonResults
    };
};
