
const fs = require('fs');
const path = require('path');

// PATHS
const HISTORY_FILE = path.join(__dirname, '../src/data/matches_history_detailed.json');
const LINEUPS_FILE = path.join(__dirname, '../src/data/lineups_2025_2026.json');
const OUTPUT_FILE = path.join(__dirname, '../src/data/player_stats_calculated.json');

// Normalization Helper
const normalize = (name) => {
    if (!name) return "";
    return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

const COACHES_TO_EXCLUDE = [
    "Roberto De Zerbi", "De Zerbi", "Luis Enrique", "Enrique L", "Luka Elsner", "Elsner L", "Adi Hutter", "Hutter A",
    "Liam Rosenior", "Rosenior L", "Carles Martinez", "Martinez C", "Will Still", "Still W",
    "Franck Haise", "Haise F", "Pierre Sage", "Sage P", "Bruno Genesio", "Genesio B",
    "Antoine Kombouare", "Kombouare A", "Regis Le Bris", "Le Bris R", "Olivier Dall'Aglio", "Dall'Aglio O",
    "Eric Roy", "Roy E", "Julien Stephan", "Stephan J", "Patrick Vieira", "Vieira P",
    "Sebastien Pocognoli", "Pocognoli S", "Laszlo Boloni", "Boloni L"
].map(n => normalize(n));

function calculateStats() {
    console.log("Starting Player Stats Calculation...");

    if (!fs.existsSync(HISTORY_FILE) || !fs.existsSync(LINEUPS_FILE)) {
        console.error("Missing data files.");
        return;
    }

    const historyData = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    const lineupsData = JSON.parse(fs.readFileSync(LINEUPS_FILE, 'utf-8'));

    const playerStats = {}; // Key: Normalized Name, Value: Stats Obj

    // Helper to extract round number: "Journée 17" -> 17
    const getRoundNumber = (roundStr) => {
        if (!roundStr) return 0;
        const match = roundStr.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
    };

    // Helper to init player
    const initPlayer = (name, team, position = "", currentRound = 0) => {
        const key = normalize(name);

        if (!playerStats[key]) {
            playerStats[key] = {
                name: name,
                team: team,
                position: position,
                matchesPlayed: 0,
                minutesPlayed: 0,
                starter: 0,
                subIn: 0,
                subOut: 0,
                goals: 0,
                assists: 0,
                yellowCards: 0,
                redCards: 0,
                latestRound: currentRound
            };
        }

        // Transfer logic: if we find the player in a later round, update their team
        if (currentRound > playerStats[key].latestRound && team) {
            playerStats[key].team = team;
            playerStats[key].latestRound = currentRound;
        }

        if (!playerStats[key].position && position) playerStats[key].position = position;
        return key;
    };

    const statsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/match_stats_2025_2026.json'), 'utf-8'));

    let matchCount = 0;
    let lineupMatchCount = 0;
    let roundFoundCount = 0;

    // 1. Process Matches
    historyData.forEach(match => {
        matchCount++;
        // Find corresponding lineup
        const lineup = lineupsData.find(l => {
            if (l.url === match.url) return true;
            const matchId = match.url.match(/\/match\/([^\/]+)/)?.[1];
            const linId = l.url.match(/\/match\/([^\/]+)/)?.[1];
            return matchId && linId && matchId === linId;
        });

        if (lineup) lineupMatchCount++;

        // ROUND DETECTION FALLBACKS
        let roundStr = match.round; // From history_detailed
        if (!roundStr && statsData[match.url]) roundStr = statsData[match.url].round;
        if (!roundStr && lineup) roundStr = lineup.round;

        const currentRound = getRoundNumber(roundStr);
        if (currentRound > 0) roundFoundCount++;

        const homeTeam = match.homeTeam;
        const awayTeam = match.awayTeam;

        if (match.events.some(e => e.player === 'Abdelli H.')) {
            // console.log(`Tracked Abdelli in match: Round ${currentRound}, Teams: ${homeTeam} vs ${awayTeam}, Match: ${match.url}`);
        }

        const playerTimes = {}; // key: normalized name, val: { start: 0/null, end: 90/null }

        // A. Process Starters from Lineup
        if (lineup && lineup.lineups) {
            // Home
            (lineup.lineups.homeStarters || []).forEach(p => {
                const key = initPlayer(p.name, homeTeam, p.pos, currentRound);
                if (key) {
                    playerStats[key].starter++;
                    playerStats[key].matchesPlayed++;
                    playerTimes[key] = { start: 0, end: 90 };
                }
            });
            // Away
            (lineup.lineups.awayStarters || []).forEach(p => {
                const key = initPlayer(p.name, awayTeam, p.pos, currentRound);
                if (key) {
                    playerStats[key].starter++;
                    playerStats[key].matchesPlayed++;
                    playerTimes[key] = { start: 0, end: 90 };
                }
            });
        }

        // B. Process Events (Subs, Cards, Goals)
        match.events.forEach(e => {
            const time = parseInt(e.time.replace('+', '')) || 0;

            // Goals/Cards
            if (e.player) {
                const key = initPlayer(e.player, e.team, "", currentRound);
                if (key) {
                    if (e.type === 'Goal') playerStats[key].goals++;
                    if (e.type === 'Yellow Card') playerStats[key].yellowCards++;
                    if (e.type === 'Red Card') {
                        playerStats[key].redCards++;
                        if (playerTimes[key]) playerTimes[key].end = time;
                    }
                }

                // Assist
                if (e.detail && e.detail.includes('Assist:')) {
                    const assistName = e.detail.split('Assist:')[1].trim();
                    // Ignore "Pénalty" and "Contre son camp" as assist providers
                    if (assistName !== 'Pénalty' && assistName !== 'Contre son camp') {
                        const aKey = initPlayer(assistName, e.team, "", currentRound);
                        if (aKey) playerStats[aKey].assists++;
                    }
                }
            }

            // Substitutions
            if (e.type === 'Substitution') {
                const playerIn = e.player;
                const playerOut = e.detail ? e.detail.replace('Out:', '').trim() : null;

                // IN
                if (playerIn) {
                    const inKey = initPlayer(playerIn, e.team, "", currentRound);
                    if (inKey) {
                        playerStats[inKey].subIn++;
                        playerStats[inKey].matchesPlayed++;
                        playerTimes[inKey] = { start: time, end: 90 };
                    }
                }

                // OUT
                if (playerOut) {
                    const outKey = initPlayer(playerOut, e.team, "", currentRound);
                    if (outKey) {
                        playerStats[outKey].subOut++;
                        if (playerTimes[outKey]) {
                            playerTimes[outKey].end = time;
                        }
                    }
                }
            }
        });

        // C. Tally Minutes
        Object.entries(playerTimes).forEach(([key, range]) => {
            if (range.start !== null && range.end !== null) {
                let mins = range.end - range.start;
                if (minsValid(mins)) {
                    if (playerStats[key]) playerStats[key].minutesPlayed += mins;
                }
            }
        });
    });

    function minsValid(m) {
        return m >= 0 && m <= 120; // Allow extra time?
    }

    // 2. Format Output - Convert Map to Array or Object keyed by Team?
    // User wants "players.json" replacement. 
    // Original structure was likely Array or Object by Team.
    // Let's verify existing players.json structure, but user said "Forget CSV".
    // Best format for frontend is probably Object keyed by Team, then Array of Players.

    // Split players and coaches automatically
    // Determine coaches by checking if they NEVER appeared in any lineup (starter or bench)
    const playersInLineups = new Set();
    lineupsData.forEach(l => {
        if (l.lineups) {
            (l.lineups.homeStarters || []).forEach(p => playersInLineups.add(normalize(p.name)));
            (l.lineups.awayStarters || []).forEach(p => playersInLineups.add(normalize(p.name)));
            (l.lineups.homeSubstitutes || []).forEach(p => playersInLineups.add(normalize(p.name)));
            (l.lineups.awaySubstitutes || []).forEach(p => playersInLineups.add(normalize(p.name)));
        }
    });

    const outputByTeam = {};
    const coachesByTeam = {};

    Object.values(playerStats).forEach(p => {
        if (!p.team) return; // Skip unknown team

        const nName = normalize(p.name);
        // If they played 0 mins, 0 starts, 0 subs AND they were never in a lineup bench/starter -> coach
        const isCoach = (p.starter === 0 && p.subIn === 0 && p.minutesPlayed === 0 && !playersInLineups.has(nName));

        if (isCoach) {
            if (!coachesByTeam[p.team]) coachesByTeam[p.team] = [];
            coachesByTeam[p.team].push(p);
        } else {
            if (!outputByTeam[p.team]) outputByTeam[p.team] = [];
            outputByTeam[p.team].push(p);
        }
    });

    console.log(`Total Matches Processed: ${matchCount}`);
    console.log(`Matches with Lineup Found: ${lineupMatchCount}`);
    console.log(`Matches with Round Found: ${roundFoundCount}`);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputByTeam, null, 2));

    const COACHES_OUTPUT_FILE = path.join(__dirname, '../src/data/coaches_stats_calculated.json');
    fs.writeFileSync(COACHES_OUTPUT_FILE, JSON.stringify(coachesByTeam, null, 2));

    const totalPlayers = Object.values(outputByTeam).flat().length;
    const totalCoaches = Object.values(coachesByTeam).flat().length;
    console.log(`Saved stats for ${totalPlayers} players to ${OUTPUT_FILE}`);
    console.log(`Saved stats for ${totalCoaches} coaches to ${COACHES_OUTPUT_FILE}`);
}

calculateStats();
