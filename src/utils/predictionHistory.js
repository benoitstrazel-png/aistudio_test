
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

import { generateBackfillHistory } from './historyGenerator';

// Seed mock history for demonstration (Backfill J1-J15)
export const seedMockHistory = (schedule) => {
    const snapshots = getSnapshots();
    // Only seed if empty
    if (snapshots.length > 0) return;

    console.log("Seeding backfilled history...");
    const backfilledSnapshots = generateBackfillHistory(schedule);

    // Save to localStorage
    // We append to existing just in case, but usually it's empty here
    const finalHistory = [...snapshots, ...backfilledSnapshots];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(finalHistory));
    console.log(`Seeded ${backfilledSnapshots.length} historical snapshots.`);
};

// Force regenerate history (useful for dev/debug)
export const regenerateHistory = (schedule) => {
    localStorage.removeItem(STORAGE_KEY);
    seedMockHistory(schedule);
    return getSnapshots();
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
