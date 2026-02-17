const fs = require('fs');
const path = require('path');

const LINEUPS_FILE = path.join(__dirname, '../src/data/lineups_2025_2026.json');
const HISTORY_FILE = path.join(__dirname, '../src/data/matches_history_detailed.json');
const STATS_FILE = path.join(__dirname, '../src/data/player_stats_calculated.json');
const POSITIONS_FILE = path.join(__dirname, '../src/data/player_positions_tm.json');
const MISSING_OUTPUT = path.join(__dirname, '../missing_positions.json');

function run() {
    console.log("Checking Player Position Coverage...");

    // 1. Collect ALL unique player names used in the app
    const allPlayers = new Set();
    const teamMap = {}; // Map player -> team

    // From Lineups
    if (fs.existsSync(LINEUPS_FILE)) {
        const lineups = JSON.parse(fs.readFileSync(LINEUPS_FILE, 'utf-8'));
        lineups.forEach(match => {
            if (match.lineups) {
                ['homeStarters', 'awayStarters', 'homeSubstitutes', 'awaySubstitutes'].forEach(key => {
                    const list = match.lineups[key];
                    if (list) {
                        list.forEach(p => {
                            if (p && p.name) {
                                allPlayers.add(p.name);
                                const team = key.startsWith('home') ? match.teams.home : match.teams.away;
                                if (team) teamMap[p.name] = team;
                            }
                        });
                    }
                });
            }
        });
    }

    // From Stats
    if (fs.existsSync(STATS_FILE)) {
        const stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));
        Object.values(stats).forEach(roster => {
            roster.forEach(p => {
                if (p.name) {
                    allPlayers.add(p.name);
                    teamMap[p.name] = p.team;
                }
            });
        });
    }

    console.log(`Total unique players found in data: ${allPlayers.size}`);

    // 2. Check against Positions File
    let positions = {};
    if (fs.existsSync(POSITIONS_FILE)) {
        positions = JSON.parse(fs.readFileSync(POSITIONS_FILE, 'utf-8'));
    }

    // Load Stats for prioritization
    let playerStatsMap = {};
    if (fs.existsSync(STATS_FILE)) {
        const stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));
        Object.values(stats).forEach(roster => {
            roster.forEach(p => {
                playerStatsMap[p.name] = p; // Direct map by name
            });
        });
    }

    const missing = [];
    const errors = [];

    // Prioritize check
    const getMinutes = (name) => {
        const stat = playerStatsMap[name];
        return stat ? (stat.minutesPlayed || 0) : 0;
    };

    allPlayers.forEach(name => {
        // Direct match check
        if (positions[name]) {
            if (positions[name].error) {
                errors.push({ name, team: teamMap[name], error: positions[name].error, minutes: getMinutes(name) });
            }
            return; // Found (valid or error)
        }

        // Exact name not found as key -> Missing
        missing.push({ name, team: teamMap[name], minutes: getMinutes(name) });
    });

    // Sort descending by minutes
    missing.sort((a, b) => b.minutes - a.minutes);
    errors.sort((a, b) => b.minutes - a.minutes);

    console.log(`Missing exact keys: ${missing.length}`);
    console.log(`Existing keys with errors: ${errors.length}`);

    const report = {
        missing,
        errors,
        totalMissingOrError: missing.length + errors.length
    };

    fs.writeFileSync(MISSING_OUTPUT, JSON.stringify(report, null, 2));
    console.log(`Report saved to ${MISSING_OUTPUT}`);

    // Log some examples
    if (errors.length > 0) {
        console.log("Top 5 Errors by Matches:", errors.slice(0, 5));
    }
    if (missing.length > 0) {
        console.log("Top 5 Missing by Matches:", missing.slice(0, 5));
    }
}

run();
