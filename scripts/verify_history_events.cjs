
const fs = require('fs');
const path = require('path');

const HISTORY_FILE = path.join(__dirname, '../src/data/matches_history_detailed.json');

try {
    const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    console.log(`Loaded ${data.length} matches.`);

    let missingEvents = 0;
    data.forEach((m, i) => {
        if (!m.events || !Array.isArray(m.events)) {
            // console.log(`Match ${m.url || i} has NO events.`);
            missingEvents++;
        }
    });

    console.log(`Matches missing events: ${missingEvents}`);

} catch (e) {
    console.error("FATAL: Failed to parse history file.", e);
}
