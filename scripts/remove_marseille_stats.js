const fs = require('fs');
const path = require('path');

const STATS_FILE = path.join(__dirname, '../src/data/match_stats_2025_2026.json');

try {
    const stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
    const url = "https://www.flashscore.fr/match/8xM7f795/#/resume";

    if (stats[url]) {
        console.log("Removing stats for:", url);
        delete stats[url];
        fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
        console.log("Done.");
    } else {
        console.log("Key not found:", url);
    }
} catch (e) {
    console.error(e);
}
