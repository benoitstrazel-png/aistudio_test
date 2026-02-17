const fs = require('fs');
const path = require('path');

const MATCHES_FILE = path.join(__dirname, '../src/data/matches_urls_2025_2026.json');
const LINEUPS_FILE = path.join(__dirname, '../src/data/lineups_2025_2026.json');

function run() {
    console.log("Syncing Stats URLs to Lineups file...");

    if (!fs.existsSync(MATCHES_FILE) || !fs.existsSync(LINEUPS_FILE)) {
        console.error("Files not found.");
        return;
    }

    const rounds = JSON.parse(fs.readFileSync(MATCHES_FILE, 'utf8'));
    const lineups = JSON.parse(fs.readFileSync(LINEUPS_FILE, 'utf8'));

    // Create a map of ID -> statsUrl
    const urlMap = new Map();

    rounds.forEach(round => {
        if (!round.matches) return;
        round.matches.forEach(m => {
            // Extract ID from original URL to key
            // url: https://www.flashscore.fr/match/ID/#/resume
            const idMatch = m.url.match(/match\/([a-zA-Z0-9_\-]+)\//);
            if (idMatch && m.statsUrl) {
                const id = idMatch[1];
                urlMap.set(id, {
                    statsUrl: m.statsUrl,
                    statsUrlFirstHalf: m.statsUrlFirstHalf,
                    statsUrlSecondHalf: m.statsUrlSecondHalf
                });
            } else if (m.url.includes('mid=') && m.statsUrl) {
                const id = m.url.split('mid=')[1].split('&')[0].split('#')[0];
                urlMap.set(id, {
                    statsUrl: m.statsUrl,
                    statsUrlFirstHalf: m.statsUrlFirstHalf,
                    statsUrlSecondHalf: m.statsUrlSecondHalf
                });
            }
        });
    });

    console.log(`Loaded ${urlMap.size} stats URLs.`);

    // Update lineups
    let updatedCount = 0;
    lineups.forEach(match => {
        // Extract ID from lineup match URL
        let id = null;
        if (match.url.includes('mid=')) {
            id = match.url.split('mid=')[1].split('&')[0].split('#')[0];
        } else {
            const m = match.url.match(/match\/([a-zA-Z0-9_\-]+)\//);
            if (m) id = m[1];
        }

        if (id && urlMap.has(id)) {
            const urls = urlMap.get(id);
            if (match.statsUrl !== urls.statsUrl) {
                match.statsUrl = urls.statsUrl;
                match.statsUrlFirstHalf = urls.statsUrlFirstHalf;
                match.statsUrlSecondHalf = urls.statsUrlSecondHalf;
                updatedCount++;
            }
        }
    });

    console.log(`Updated ${updatedCount} matches in lineups file.`);

    // Save
    fs.writeFileSync(LINEUPS_FILE, JSON.stringify(lineups, null, 2));
    console.log("Saved lineups_2025_2026.json");
}

run();
