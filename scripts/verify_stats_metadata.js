
const fs = require('fs');
const path = require('path');

const STATS_FILE = path.join(__dirname, '../src/data/match_stats_2025_2026.json');

try {
    if (!fs.existsSync(STATS_FILE)) {
        console.log("Stats file not found.");
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));
    const matches = Object.values(data);

    console.log(`Total matches in file: ${matches.length}`);

    // We don't strictly have "round" in match_stats unless we added it. 
    // But we can check if there are matches with missing metadata.

    let missingMetadata = 0;
    let validMatches = 0;

    // Sample check for J1-J7 (assuming we can identify them or just check ALL)
    // The user specifically mentioned J1-J7. 
    // Let's just check how many matches have id, date, timestamp.

    matches.forEach(m => {
        const hasId = !!m.id;
        const hasDate = !!m.date;
        const hasTs = !!m.timestamp;

        if (hasId && hasDate && hasTs) {
            validMatches++;
        } else {
            missingMetadata++;
            // console.log(`Missing metadata for ${m.url}: ID=${hasId}, Date=${hasDate}, TS=${hasTs}`);
        }
    });

    console.log(`Matches with COMPLETE metadata: ${validMatches}`);
    console.log(`Matches with MISSING metadata: ${missingMetadata}`);

    if (missingMetadata === 0) {
        console.log("SUCCESS: All matches have id, date, and timestamp.");
    } else {
        console.log("WARNING: Some matches are still missing metadata.");
    }

} catch (e) {
    console.error("Error:", e.message);
}
