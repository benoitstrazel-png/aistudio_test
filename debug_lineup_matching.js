import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use absolute paths
const LINEUPS_PATH = path.join(process.cwd(), 'src/data/lineups_2025_2026.json');
const PLAYERS_PATH = path.join(process.cwd(), 'src/data/real_players.json');

console.log('Reading lineups from:', LINEUPS_PATH);
const lineupsData = JSON.parse(fs.readFileSync(LINEUPS_PATH, 'utf8'));
const realPlayersData = JSON.parse(fs.readFileSync(PLAYERS_PATH, 'utf8'));

// Helper to normalize
const norm = (str) => str?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() || "";

let report = '';
const log = (msg) => { console.log(msg); report += msg + '\n'; };

const clubNames = Object.keys(realPlayersData);
log(`Analyzing ${clubNames.length} clubs...\n`);

clubNames.forEach(clubName => {
    const activePlayerNames = new Set();

    // NORMALIZE CLUB NAME for matching
    const targetClubNorm = norm(clubName);

    lineupsData.forEach(match => {
        const homeNorm = norm(match.teams.home);
        const awayNorm = norm(match.teams.away);

        // Try strict and partial matching for club names
        if (homeNorm === targetClubNorm || homeNorm.includes(targetClubNorm) || targetClubNorm.includes(homeNorm)) {
            match.lineups.homeStarters.forEach(name => activePlayerNames.add(norm(name.replace(/\(.*\)/g, '')).trim()));
            match.lineups.homeSubstitutes.forEach(name => activePlayerNames.add(norm(name.replace(/\(.*\)/g, '')).trim()));
        }
        if (awayNorm === targetClubNorm || awayNorm.includes(targetClubNorm) || targetClubNorm.includes(awayNorm)) {
            match.lineups.awayStarters.forEach(name => activePlayerNames.add(norm(name.replace(/\(.*\)/g, '')).trim()));
            match.lineups.awaySubstitutes.forEach(name => activePlayerNames.add(norm(name.replace(/\(.*\)/g, '')).trim()));
        }
    });

    const roster = realPlayersData[clubName] || [];

    let matchedCount = 0;
    roster.forEach(p => {
        const pName = norm(p.name);
        for (let activeName of activePlayerNames) {
            const partsA = activeName.split(' ').filter(x => x.length > 2);
            const partsB = pName.split(' ').filter(x => x.length > 2);
            const match = partsA.some(partA => pName.includes(partA)) ||
                partsB.some(partB => activeName.includes(partB));
            if (match) {
                matchedCount++;
                break;
            }
        }
    });

    log(`[${clubName}] ActiveWhiltelist: ${activePlayerNames.size} | Matches: ${matchedCount}/${roster.length}`);
    if (matchedCount < 11) {
        // Log the first few roster names to see what's wrong (maybe format e.g. "Last F.")
        log(`   Roster Sample: ${roster.slice(0, 3).map(p => p.name).join(', ')}`);
        log(`   Active Sample: ${Array.from(activePlayerNames).slice(0, 3).join(', ')}`);
    }
});

fs.writeFileSync(path.join(process.cwd(), 'debug_report.txt'), report, 'utf8');
