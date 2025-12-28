
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PLAYERS_DB_PATH = path.join(__dirname, '../src/data/players_static.js');
const MATCHES_PATH = path.join(__dirname, '../src/data/matches_history_detailed.json');

// Load Data
let playersRaw = fs.readFileSync(PLAYERS_DB_PATH, 'utf8');
const arrayStart = playersRaw.indexOf('[');
const arrayEnd = playersRaw.lastIndexOf(']') + 1;
const playersJson = playersRaw.substring(arrayStart, arrayEnd);

let players;
try {
    players = JSON.parse(playersJson);
} catch (e) {
    // If simple parse fails (e.g. trailing commas or JS objects), try eval approach specific to the file
    // But players_static.js usually has valid JSON inside the export.
    console.log("JSON parse failed, trying simplified extraction...");
    players = eval(playersJson);
}

const matches = JSON.parse(fs.readFileSync(MATCHES_PATH, 'utf8'));

console.log(`Loaded ${players.length} players and ${matches.length} matches.`);

// 1. Calculate Team Stats (Goals Conceded, Clean Sheets)
const teamStats = {};

matches.forEach(match => {
    const home = match.homeTeam;
    const away = match.awayTeam;
    const [homeScore, awayScore] = match.score.split('-').map(Number);

    if (!teamStats[home]) teamStats[home] = { conceded: 0, cleanSheets: 0, matches: 0 };
    if (!teamStats[away]) teamStats[away] = { conceded: 0, cleanSheets: 0, matches: 0 };

    // Home Team Stats
    teamStats[home].conceded += awayScore;
    if (awayScore === 0) teamStats[home].cleanSheets += 1;
    teamStats[home].matches += 1;

    // Away Team Stats
    teamStats[away].conceded += homeScore;
    if (homeScore === 0) teamStats[away].cleanSheets += 1;
    teamStats[away].matches += 1;
});

// 2. Assign to Goalkeepers
// Group GKs by Squad (using Squad name as key)
const gksBySquad = {};
players.filter(p => p.Pos && p.Pos.includes('GK')).forEach(p => {
    const squad = p.Squad;
    if (!gksBySquad[squad]) gksBySquad[squad] = [];
    gksBySquad[squad].push(p);
});

let updatedCount = 0;

Object.keys(gksBySquad).forEach(squad => {
    const teamGks = gksBySquad[squad];
    if (teamGks.length === 0) return;

    // Find Main GK (Max Min)
    const mainGk = teamGks.reduce((prev, current) => (prev.Min > current.Min) ? prev : current);

    // Get Team Stats
    // Squad names in players might differ slightly from match files.
    // matches_history_detailed uses "PSG", "Marseille", "Lorient".
    // players_static.js uses "Paris S-G" or "PSG"? 
    // Let's check matching.

    let stats = teamStats[squad];

    // Simple normalization map if needed
    if (!stats) {
        // Try fuzzy find
        const foundKey = Object.keys(teamStats).find(k => {
            // e.g. "Paris S-G" vs "PSG".
            // Simple check: mapped squad contains db squad or vice versa
            return squad.includes(k) || k.includes(squad) || (squad === "Paris S-G" && k === "PSG");
        });
        if (foundKey) stats = teamStats[foundKey];
    }

    if (stats) {
        mainGk.GoalsConceded = stats.conceded;
        mainGk.CleanSheets = stats.cleanSheets;
        mainGk.ConcededPer90 = parseFloat((stats.conceded / (stats.matches)).toFixed(2)) || 0; // Avg per match
        updatedCount++;
    } else {
        // console.log(`No match stats for squad: ${squad}`);
    }
});

console.log(`Updated stats for ${updatedCount} main goalkeepers.`);

// 3. Save back to JS file
const newFileContent = `export const PLAYERS_DB = ${JSON.stringify(players, null, 4)};`;
fs.writeFileSync(PLAYERS_DB_PATH, newFileContent, 'utf8');

console.log(`Details saved to players_static.js`);
