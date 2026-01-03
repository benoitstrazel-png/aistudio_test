import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const J16_FILE = path.join(__dirname, '../src/data/matches_j16_scraped.json');
const HISTORY_FILE = path.join(__dirname, '../src/data/matches_history_detailed.json');

function harmoniseEvents(events, homeTeam, awayTeam) {
    return events.map(e => {
        // Source J16 uses "players" array, target history uses "player" string
        let player = '';
        if (e.players && e.players.length > 0) {
            player = e.players[0]; // Take first player
            if (e.type === 'Substitution' && e.players.length > 1) {
                // For substitutions, we might want to store both but the history format seems to favor single player name?
                // Looking at history schema, "player" is the one who acted.
                // In history, substitutions often don't have separate in/out?
                player = e.players[0];
            }
        } else if (e.player) {
            player = e.player;
        }

        return {
            time: e.time.replace("'", ""),
            player: player,
            type: e.type,
            detail: e.detail,
            team: e.team
        };
    });
}

function run() {
    if (!fs.existsSync(J16_FILE)) {
        console.log('J16 file not found, skipping merge.');
        return;
    }

    const j16Data = JSON.parse(fs.readFileSync(J16_FILE, 'utf8'));
    let historyData = [];
    if (fs.existsSync(HISTORY_FILE)) {
        historyData = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    }

    console.log(`Merging ${j16Data.length} matches from J16...`);

    j16Data.forEach(m => {
        // Check for duplicates
        if (historyData.some(hm => hm.url === m.url)) {
            console.log(`Skipping duplicate: ${m.match}`);
            return;
        }

        const consolidatedMatch = {
            homeTeam: m.homeTeam,
            awayTeam: m.awayTeam,
            score: m.score,
            round: "Journée 16",
            events: harmoniseEvents(m.events, m.homeTeam, m.awayTeam),
            url: m.url,
            referee: m.referee || "N/A"
        };

        historyData.push(consolidatedMatch);
    });

    // Save history
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(historyData, null, 2));
    console.log(`Successfully merged J16 data into ${HISTORY_FILE}`);

    // Optional: Delete J16 file
    try {
        fs.unlinkSync(J16_FILE);
        console.log(`Deleted redundant file: ${J16_FILE}`);
    } catch (e) {
        console.error(`Error deleting J16 file: ${e.message}`);
    }
}

run();
