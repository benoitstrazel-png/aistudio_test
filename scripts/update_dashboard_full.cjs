
const fs = require('fs');
const path = require('path');

// FILES
const APP_DATA_FILE = path.join(__dirname, '../src/data/app_data.json');
const HISTORY_FILE = path.join(__dirname, '../src/data/matches_history_detailed.json');
const LEGACY_FILE = path.join(__dirname, '../src/data/matches_legacy.json');
const URLS_FILE = path.join(__dirname, '../src/data/matches_urls_2025_2026.json');

// --- MATH HELPERS ---
function seededRandom(seed) {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
}

function getPoissonRandom(lam) {
    const L = Math.exp(-lam);
    let k = 0; let p = 1.0;
    while (p > L) { k++; p *= Math.random(); }
    return k > 0 ? k - 1 : 0;
}

// --- PREDICTION ENGINE ---
function predictMatch(home, away, teamStats, week = 1) {
    const hStats = teamStats[home] || { att: 1.0, def: 1.0, discipline: { rc_prob: 0, yc_avg: 1.5 } };
    const aStats = teamStats[away] || { att: 1.0, def: 1.0, discipline: { rc_prob: 0, yc_avg: 1.5 } };
    const AVG_H = 1.35; const AVG_A = 1.15;

    let exp_h = hStats.att * aStats.def * AVG_H;
    let exp_a = aStats.att * hStats.def * AVG_A;

    // Mood
    const mood_seed = week * 777;
    const round_mood = 0.9 + (seededRandom(mood_seed) * 0.2);
    exp_h *= round_mood; exp_a *= round_mood;

    if (hStats.def < 0.95 && aStats.def < 0.95) { exp_h *= 0.75; exp_a *= 0.75; }

    const ITERATIONS = 500;
    const scoreCounts = {};
    const winCounts = { '1': 0, 'N': 0, '2': 0 };
    let over25 = 0;

    for (let i = 0; i < ITERATIONS; i++) {
        const s_h = getPoissonRandom(exp_h);
        const s_a = getPoissonRandom(exp_a);
        const k = `${s_h}-${s_a}`;
        scoreCounts[k] = (scoreCounts[k] || 0) + 1;
        if (s_h > s_a) winCounts['1']++; else if (s_a > s_h) winCounts['2']++; else winCounts['N']++;
        if ((s_h + s_a) > 2.5) over25++;
    }

    const bestScore = Object.keys(scoreCounts).reduce((a, b) => scoreCounts[a] > scoreCounts[b] ? a : b);
    const bestOutcome = Object.keys(winCounts).reduce((a, b) => winCounts[a] > winCounts[b] ? a : b);

    let winnerLabel = "Nul";
    if (bestOutcome === '1') winnerLabel = home;
    if (bestOutcome === '2') winnerLabel = away;

    const w_conf = Math.round((winCounts[bestOutcome] / ITERATIONS) * 100);
    const probOver = over25 / ITERATIONS;
    const goals_label = probOver > 0.5 ? "+2.5 Buts" : "-2.5 Buts";
    const goals_conf = Math.round((probOver > 0.5 ? probOver : 1 - probOver) * 100);

    let advice = "Les deux marquent (BTTS)";
    if (winCounts['1'] / ITERATIONS > 0.6) advice = `Victoire ${home}`;
    else if (winCounts['2'] / ITERATIONS > 0.6) advice = `Victoire ${away}`;

    // --- RED CARD ANALYSIS ---
    // Base Risk from Team History
    let h_risk = hStats.discipline ? (hStats.discipline.rc_prob || 0) : 0;
    let a_risk = aStats.discipline ? (aStats.discipline.rc_prob || 0) : 0;

    // Pattern Adjustments
    // If Home Team is "Weak" (Att < 0.9) and Away is "Strong" (Att > 1.2), increase risk of defensive red card for Home
    // Check discipline patterns
    if (hStats.discipline) {
        if (aStats.att > 1.2 && hStats.discipline.cards_vs_strong > hStats.discipline.cards_vs_weak) {
            h_risk *= 1.3; // Boost risk if they tend to foul strong teams
        }
        // 2nd Half Fatigue Risk
        if (hStats.discipline.cards_2h > hStats.discipline.cards_1h * 1.5) {
            // Late game discipline issues
            h_risk *= 1.1;
        }
    }
    if (aStats.discipline) {
        if (hStats.att > 1.2 && aStats.discipline.cards_vs_strong > aStats.discipline.cards_vs_weak) {
            a_risk *= 1.3;
        }
        if (aStats.discipline.cards_2h > aStats.discipline.cards_1h * 1.5) {
            a_risk *= 1.1;
        }
    }

    // Probability of AT LEAST 1 Red Card in match
    // P(Union) = P(A) + P(B) - P(A)*P(B)
    const match_rc_prob = h_risk + a_risk - (h_risk * a_risk);
    const rc_percent = Math.min(99, Math.round(match_rc_prob * 100));

    // Advice injection
    if (match_rc_prob > 0.3) { // >30% is high for red card
        advice += " - Risque Exclusion";
    }

    return {
        score: bestScore, scores: { home: parseInt(bestScore.split('-')[0]), away: parseInt(bestScore.split('-')[1]) },
        score_conf: Math.round((scoreCounts[bestScore] / ITERATIONS) * 100),
        winner: winnerLabel, winner_conf: w_conf,
        goals_pred: goals_label, goals_conf,
        confidence: w_conf, advice,
        red_card_prob: rc_percent, // NEW FIELD
        probs: { '1': winCounts['1'] / ITERATIONS, 'N': winCounts['N'] / ITERATIONS, '2': winCounts['2'] / ITERATIONS }
    };
}

// --- HELPER: CLEAN TEAMS ---
function cleanTeamName(name) {
    if (!name) return "Unknown";
    name = name.trim();
    if (name.toLowerCase().includes('saint-etienne') || name.toLowerCase().includes('st etienne')) return 'Saint-Étienne';
    if (name.toLowerCase() === 'psg' || name.toLowerCase().includes('paris sg')) return 'PSG';
    return name;
}

function run() {
    console.log("Starting Full Dashboard Rebuild (V3: Discipline Model)...");

    // 1. Load Data
    const appData = JSON.parse(fs.readFileSync(APP_DATA_FILE, 'utf-8'));
    const history = fs.existsSync(HISTORY_FILE) ? JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8')) : [];
    const legacy = fs.existsSync(LEGACY_FILE) ? JSON.parse(fs.readFileSync(LEGACY_FILE, 'utf-8')) : [];
    const urlsData = fs.existsSync(URLS_FILE) ? JSON.parse(fs.readFileSync(URLS_FILE, 'utf-8')) : [];

    // 2. Initial Stats (Att/Def)
    const statsBase = {};
    const processMatch = (h, a, hg, ag) => {
        h = cleanTeamName(h); a = cleanTeamName(a);
        if (!statsBase[h]) statsBase[h] = { gf: 0, ga: 0, p: 0 };
        if (!statsBase[a]) statsBase[a] = { gf: 0, ga: 0, p: 0 };
        statsBase[h].gf += hg; statsBase[h].ga += ag; statsBase[h].p++;
        statsBase[a].gf += ag; statsBase[a].ga += hg; statsBase[a].p++;
    };
    history.forEach(m => {
        if (m.score && m.score.includes('-')) {
            const [hg, ag] = m.score.split('-').map(Number);
            processMatch(m.homeTeam, m.awayTeam, hg, ag);
        }
    });

    // Helper to get opponent strength
    const getTeamStrength = (team) => {
        const s = statsBase[cleanTeamName(team)];
        if (!s) return "Avg";
        const avg = (s.gf / Math.max(1, s.p)) / 1.35;
        if (avg > 1.2) return "Strong";
        if (avg < 0.9) return "Weak";
        return "Avg";
    };

    // 3. Discipline Analysis
    const disciplineStats = {};
    // Struct: { team: { rc: 0, yc: 0, matches: 0, cards_1h: 0, cards_2h: 0, cards_vs_strong: 0, cards_vs_weak: 0 } }

    const countCard = (team, time, opponent) => {
        team = cleanTeamName(team);
        if (!disciplineStats[team]) disciplineStats[team] = { rc: 0, yc: 0, matches: 0, cards_1h: 0, cards_2h: 0, cards_vs_strong: 0, cards_vs_weak: 0 };
        // Increment global counters in separate loop? 
        // No, we call this per event.
        if (time <= 45) disciplineStats[team].cards_1h++; else disciplineStats[team].cards_2h++;

        const str = getTeamStrength(opponent);
        if (str === "Strong") disciplineStats[team].cards_vs_strong++;
        if (str === "Weak") disciplineStats[team].cards_vs_weak++;
    };

    history.forEach(m => {
        const h = cleanTeamName(m.homeTeam);
        const a = cleanTeamName(m.awayTeam);

        if (!disciplineStats[h]) disciplineStats[h] = { rc: 0, yc: 0, matches: 0, cards_1h: 0, cards_2h: 0, cards_vs_strong: 0, cards_vs_weak: 0 };
        if (!disciplineStats[a]) disciplineStats[a] = { rc: 0, yc: 0, matches: 0, cards_1h: 0, cards_2h: 0, cards_vs_strong: 0, cards_vs_weak: 0 };

        disciplineStats[h].matches++;
        disciplineStats[a].matches++;

        if (m.events) {
            m.events.forEach(e => {
                if (e.type.includes('Card') || e.type.includes('Carton')) {
                    const isRed = e.type.includes('Red') || e.type.includes('Rouge') || e.detail.includes('Second yellow');
                    const team = cleanTeamName(e.team);

                    if (team === h) {
                        if (isRed) disciplineStats[h].rc++; else disciplineStats[h].yc++;
                        countCard(h, parseInt(e.time), a);
                    } else if (team === a) {
                        if (isRed) disciplineStats[a].rc++; else disciplineStats[a].yc++;
                        countCard(a, parseInt(e.time), h);
                    }
                }
            });
        }
    });

    // Merge Discipline into Final Stats
    const finalStats = {};
    Object.keys(statsBase).forEach(t => {
        const s = statsBase[t];
        const p = Math.max(1, s.p);
        const d = disciplineStats[t] || { rc: 0, yc: 0, matches: 1, cards_1h: 0, cards_2h: 0, cards_vs_strong: 0, cards_vs_weak: 0 };
        const dp = Math.max(1, d.matches);

        finalStats[t] = {
            att: (s.gf / p) / 1.35,
            def: (s.ga / p) / 1.35,
            cluster: "Neutral",
            discipline: {
                rc_total: d.rc,
                rc_prob: d.rc / dp, // Probability per match
                yc_avg: d.yc / dp,
                cards_1h: d.cards_1h,
                cards_2h: d.cards_2h,
                cards_vs_strong: d.cards_vs_strong,
                cards_vs_weak: d.cards_vs_weak,
                matches: dp
            }
        };
    });

    // 4. Rebuild Schedule & Predict
    const newSchedule = [];
    let scheduledCount = 0;

    const historyMap = new Map();
    history.forEach(h => {
        const id = h.url.match(/match\/([A-Za-z0-9]+)/)?.[1] || h.url.match(/mid=([A-Za-z0-9]+)/)?.[1];
        if (id) historyMap.set(id, h);
    });

    let maxWeek = 0;
    urlsData.forEach(round => {
        const roundNum = parseInt(round.round.match(/\d+/)[0]);
        if (roundNum > maxWeek) maxWeek = roundNum;

        round.matches.forEach(m => {
            let match = {
                id: m.id,
                week: roundNum,
                date: m.date,
                timestamp: m.timestamp,
                status: "SCHEDULED",
                score: null,
                homeTeam: "Unknown", awayTeam: "Unknown"
            };

            const hist = historyMap.get(m.id);
            if (hist) {
                match.homeTeam = cleanTeamName(hist.homeTeam);
                match.awayTeam = cleanTeamName(hist.awayTeam);
                match.status = "FINISHED";
                if (hist.score && hist.score.includes('-')) {
                    const [h, a] = hist.score.split('-').map(Number);
                    match.score = { home: h, away: a };
                }
                // Check for Red Cards in events
                match.hasRedCard = false;
                if (hist.events) {
                    match.hasRedCard = hist.events.some(e =>
                        e.type.includes('Red') ||
                        e.type.includes('Rouge') ||
                        (e.detail && e.detail.includes('Second yellow'))
                    );
                }
            } else if (m.homeTeam && m.awayTeam) {
                match.homeTeam = cleanTeamName(m.homeTeam);
                match.awayTeam = cleanTeamName(m.awayTeam);
            }

            if (match.homeTeam !== "Unknown") {
                if (match.status === "SCHEDULED") {
                    match.prediction = predictMatch(match.homeTeam, match.awayTeam, finalStats, roundNum);
                }
                newSchedule.push(match);
                scheduledCount++;
            }
        });
    });

    // 5. Simulate Missing Rounds (e.g. J34)
    if (maxWeek < 34) {
        console.log(`Schedule incomplete (Max Week ${maxWeek}). Generating remaining matches...`);
        const teams = Object.keys(finalStats).filter(t => t !== "Unknown" && t !== "Generic");
        const playedPairs = new Set();
        newSchedule.forEach(m => playedPairs.add(`${m.homeTeam}|${m.awayTeam}`));

        let currentWeek = maxWeek + 1;

        const allMatches = [];
        for (let i = 0; i < teams.length; i++) {
            for (let j = 0; j < teams.length; j++) {
                if (i !== j) allMatches.push({ h: teams[i], a: teams[j] });
            }
        }
        const missing = allMatches.filter(m => !playedPairs.has(`${m.h}|${m.a}`));

        const MATCHES_PER_WEEK = 9;
        for (let i = 0; i < missing.length; i += MATCHES_PER_WEEK) {
            if (currentWeek > 34) break;
            const chunk = missing.slice(i, i + MATCHES_PER_WEEK);
            const weekDate = new Date();
            weekDate.setDate(weekDate.getDate() + (currentWeek - 20) * 7);

            chunk.forEach(pair => {
                const pred = predictMatch(pair.h, pair.a, finalStats, currentWeek);
                newSchedule.push({
                    id: `sim_${pair.h}_${pair.a}_${currentWeek}`,
                    homeTeam: pair.h,
                    awayTeam: pair.a,
                    week: currentWeek,
                    date: weekDate.toISOString().split('T')[0],
                    status: "SCHEDULED",
                    score: null,
                    prediction: pred
                });
                scheduledCount++;
            });
            currentWeek++;
        }
    }

    // 6. Save Prediction History Snapshot
    try {
        const HISTORY_PRED_FILE = path.join(__dirname, '../src/data/predictions_history.json');
        let predHistory = [];
        if (fs.existsSync(HISTORY_PRED_FILE)) {
            predHistory = JSON.parse(fs.readFileSync(HISTORY_PRED_FILE, 'utf-8'));
        }

        // Create Snapshot
        // Source is the current MAX week played (approx maxWeek from urls or calculated from finished matches)
        // Actually, 'maxWeek' calculated earlier is the max round FOUND in the file, not necessarily fully played.
        // Let's use the one that is "Current"

        // Filter predictions for FUTURE matches from 'appData.currentWeek'
        const futurePredictions = newSchedule.filter(m => m.status === 'SCHEDULED' && m.week > appData.currentWeek && m.prediction).map(m => ({
            id: m.id,
            week: m.week,
            home: m.homeTeam,
            away: m.awayTeam,
            prediction: m.prediction
        }));

        if (futurePredictions.length > 0) {
            // Check if we already have a snapshot for this week
            const existingIndex = predHistory.findIndex(p => p.sourceWeek === appData.currentWeek);

            const snapshot = {
                sourceWeek: appData.currentWeek,
                timestamp: Date.now(),
                predictions: futurePredictions
            };

            if (existingIndex !== -1) {
                // Update existing
                predHistory[existingIndex] = snapshot;
                console.log(`Updated prediction snapshot for Week ${appData.currentWeek}`);
            } else {
                // Add new
                predHistory.push(snapshot);
                console.log(`Created new prediction snapshot for Week ${appData.currentWeek}`);
            }

            fs.writeFileSync(HISTORY_PRED_FILE, JSON.stringify(predHistory, null, 2));
        }
    } catch (e) {
        console.error("Error saving prediction history:", e);
    }

    appData.fullSchedule = newSchedule;
    appData.teamStats = finalStats;

    fs.writeFileSync(APP_DATA_FILE, JSON.stringify(appData, null, 2));
    console.log(`Saved app_data.json with ${scheduledCount} matches.`);

    // CHAIN: Update Player Stats
    try {
        console.log("Triggering Player Stats Calculation...");
        require('./calculate_player_stats.cjs');
    } catch (e) {
        console.error("Failed to update player stats:", e);
    }
}

run();
