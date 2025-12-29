import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// Load Data
const lineups = require('./src/data/lineups_2025_2026.json');
const playersDB = require('./src/data/real_players.json'); // Adjust path if needed

const clubName = "Brest"; // Target club
const norm = (str) => str?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() || "";

const output = [];
const log = (msg) => output.push(msg);

log(`Analyzing stats for club: ${clubName}`);

// ... (logic) ...

lineups.forEach(match => {
    const homeNorm = norm(match.teams.home);
    const awayNorm = norm(match.teams.away);
    const targetNorm = norm(clubName);

    let isHome = homeNorm.includes(targetNorm);
    let isAway = awayNorm.includes(targetNorm);

    if (isHome || isAway) {
        matchCount++;
        const side = isHome ? 'home' : 'away';
        const starters = isHome ? match.lineups.homeStarters : match.lineups.awayStarters;

        starters.forEach(name => {
            const cleanName = name.replace(/\(.*\)/g, '').trim();
            activeNames.add(cleanName);
            startsCount.set(cleanName, (startsCount.get(cleanName) || 0) + 1);
        });
    }
});

log(`Found ${matchCount} matches for ${clubName}.`);
log("\nTop Starters (Lineup Data):");
const sortedStarts = [...startsCount.entries()].sort((a, b) => b[1] - a[1]);
sortedStarts.slice(0, 15).forEach(([name, count]) => {
    log(`- ${name}: ${count}`);
});

log("\nChecking Specific Players:");
const targets = ["Castillo", "Del Castillo", "Chotard", "Doumbia", "Lala"];
targets.forEach(t => {
    log(`Scanning for '${t}':`);
    [...startsCount.keys()].forEach(k => {
        if (norm(k).includes(norm(t))) {
            log(`  MATCH: "${k}" (Starts: ${startsCount.get(k)})`);
        }
    });
});

const fs = require('fs');
fs.writeFileSync('debug_output.txt', output.join('\n'));
console.log("Written to debug_output.txt");
