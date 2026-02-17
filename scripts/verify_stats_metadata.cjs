
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

    let missingMetadata = 0;
    let validMatches = 0;

    let sampleMissing = [];

    matches.forEach(m => {
        const hasId = !!m.id;
        const hasDate = !!m.date;
        const hasTs = !!m.timestamp;

        if (hasId && hasDate && hasTs) {
            validMatches++;
        } else {
            missingMetadata++;
            if (sampleMissing.length < 5) {
                sampleMissing.push(m.url);
            }
        }
    });

    console.log(`Matches with COMPLETE metadata: ${validMatches}`);
    console.log(`Matches with MISSING metadata: ${missingMetadata}`);

    if (missingMetadata > 0) {
        console.log("Sample missing URLs:", sampleMissing);
    }

} catch (e) {
    console.error("Error:", e.message);
}
