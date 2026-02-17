
const fs = require('fs');
const path = require('path');

const HISTORY_FILE = path.join(__dirname, '../src/data/matches_history_detailed.json');

try {
    if (!fs.existsSync(HISTORY_FILE)) {
        console.error("File not found:", HISTORY_FILE);
        process.exit(1);
    }

    const matches = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    console.log(`Total matches loaded: ${matches.length}`);

    const rounds = {};
    const seenUrls = new Set();
    const duplicates = [];

    matches.forEach((m, index) => {
        // 1. Group by Round
        const r = m.round || "Unknown Round";
        if (!rounds[r]) rounds[r] = [];
        rounds[r].push(m);

        // 2. Check Duplicates (by URL)
        // Some matches might not have URL, use Home+Away+Round as fallback unique key
        const uniqueKey = m.url ? m.url : `${m.homeTeam}-${m.awayTeam}-${r}`;

        if (seenUrls.has(uniqueKey)) {
            duplicates.push({
                index,
                round: r,
                match: `${m.homeTeam} vs ${m.awayTeam}`,
                url: m.url
            });
        } else {
            seenUrls.add(uniqueKey);
        }
    });

    // Report Round Counts
    console.log("\n--- Round Analysis (Expected 9 matches/round) ---");
    const roundNames = Object.keys(rounds).sort((a, b) => {
        // Human sort for "Journée X"
        const getNum = s => parseInt(s.replace(/\D/g, '') || 0);
        return getNum(a) - getNum(b);
    });

    let incompleteRounds = 0;
    roundNames.forEach(r => {
        const count = rounds[r].length;
        if (count !== 9) {
            console.log(`[WARN] ${r}: ${count} matches`);
            incompleteRounds++;
        } else {
            // console.log(`[OK] ${r}: ${count} matches`);
        }
    });

    if (incompleteRounds === 0) console.log("All rounds have 9 matches.");

    // Report Duplicates
    console.log(`\n--- Duplicates Found: ${duplicates.length} ---`);
    if (duplicates.length > 0) {
        duplicates.slice(0, 10).forEach(d => {
            console.log(`  Round: ${d.round} | ${d.match} | URL: ${d.url}`);
        });
        if (duplicates.length > 10) console.log(`  ... and ${duplicates.length - 10} more.`);
    }

} catch (e) {
    console.error("Error:", e.message);
}
