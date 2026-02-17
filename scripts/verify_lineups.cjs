
const fs = require('fs');
const path = require('path');

const LINEUPS_FILE = path.join(__dirname, '../src/data/lineups_2025_2026.json');

try {
    const data = JSON.parse(fs.readFileSync(LINEUPS_FILE, 'utf-8'));
    console.log(`Loaded ${data.length} lineup entries.`);

    let errors = 0;
    data.forEach((m, i) => {
        if (!m.teams || !m.teams.home || !m.teams.away) {
            console.error(`Index ${i}: Missing teams.`);
            errors++;
        }
        if (!m.lineups) {
            console.error(`Index ${i}: Missing lineups object.`);
            errors++;
        } else {
            if (!m.lineups.homeStarters) console.error(`Index ${i}: Missing homeStarters`);
            if (!m.lineups.awayStarters) console.error(`Index ${i}: Missing awayStarters`);
        }
    });

    if (errors === 0) console.log("Lineups File Integrity: OK");
    else console.log(`Found ${errors} errors.`);

} catch (e) {
    console.error("FATAL: Failed to parse lineups file.", e);
}
