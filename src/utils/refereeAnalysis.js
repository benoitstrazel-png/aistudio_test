/**
 * Utility to analyze referee performance and statistics from match history.
 */

export const analyzeReferees = (matches) => {
    if (!matches || !Array.isArray(matches)) return [];

    const refereeStats = {};

    matches.forEach(match => {
        const rawRef = match.referee;
        if (!rawRef || rawRef === 'N/A') return;

        // Clean referee name: "Vernice M.\n (Fra)" -> "Vernice M."
        const refName = rawRef.split('\n')[0].trim();
        if (!refName || refName === 'N/A') return;

        if (!refereeStats[refName]) {
            refereeStats[refName] = {
                name: refName,
                matches: 0,
                yellowCards: 0,
                redCards: 0,
                penalties: 0,
                timeline: Array(6).fill(0).map((_, i) => ({
                    name: `${i * 15}-${(i + 1) * 15}`,
                    cards: 0,
                    yellows: 0,
                    reds: 0
                }))
            };
        }

        const stats = refereeStats[refName];
        stats.matches += 1;

        if (match.events) {
            match.events.forEach(event => {
                // Determine time bucket (0-15, 16-30, ..., 76-90+)
                const rawTime = parseInt(event.time);
                const time = isNaN(rawTime) ? 0 : rawTime;
                const bucketIndex = Math.min(Math.floor((time - 1) / 15), 5);
                const safeBucketIndex = bucketIndex < 0 ? 0 : bucketIndex;

                if (event.type === 'Yellow Card') {
                    stats.yellowCards += 1;
                    if (stats.timeline[safeBucketIndex]) {
                        stats.timeline[safeBucketIndex].cards += 1;
                        stats.timeline[safeBucketIndex].yellows += 1;
                    }
                } else if (event.type === 'Red Card') {
                    stats.redCards += 1;
                    if (stats.timeline[safeBucketIndex]) {
                        stats.timeline[safeBucketIndex].cards += 1;
                        stats.timeline[safeBucketIndex].reds += 1;
                    }
                } else if (event.type === 'Goal' && event.detail && event.detail.toLowerCase().includes('pénalty')) {
                    stats.penalties += 1;
                }
            });
        }
    });

    // Convert to array and calculate derived metrics
    return Object.values(refereeStats).map(ref => ({
        ...ref,
        cardsPerMatch: parseFloat(((ref.yellowCards + ref.redCards) / ref.matches).toFixed(2)),
        yellowsPerMatch: parseFloat((ref.yellowCards / ref.matches).toFixed(2)),
        redsPerMatch: parseFloat((ref.redCards / ref.matches).toFixed(2)),
        penaltiesPerMatch: parseFloat((ref.penalties / ref.matches).toFixed(2)),
    })).sort((a, b) => b.matches - a.matches);
};
