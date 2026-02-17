
const fs = require('fs');
const path = require('path');

// FILES
const HISTORY_FILE = path.join(__dirname, '../src/data/matches_history_detailed.json');
// Use App Data for the schedule source as it has team names populated
const APP_DATA_FILE = path.join(__dirname, '../src/data/app_data.json');
const OUTPUT_FILE = path.join(__dirname, '../src/data/predictions_history.json');

// --- MATH HELPERS ---
// Mulberry32 Seeded Random
let globalSeed = 1337;
function seedRandom(s) { globalSeed = s; }
function random() {
    let t = globalSeed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
}

// Separate seed function for deterministic mood that doesn't advance global state if needed,
// but for backfill we want a stream. using random() for poisson is fine if we seed at start of match or week.
function getPoissonRandom(lam) {
    const L = Math.exp(-lam);
    let k = 0; let p = 1.0;
    while (p > L) { k++; p *= random(); }
    return k > 0 ? k - 1 : 0;
}

// --- PREDICTION ENGINE ---
function predictMatch(home, away, teamStats, week = 1) {
    // Seed for this match specifically to be deterministic
    // Using string hash of names + week
    const matchString = `${home}${away}${week}`;
    let hash = 0;
    for (let i = 0; i < matchString.length; i++) hash = Math.imul(31, hash) + matchString.charCodeAt(i) | 0;
    seedRandom(Math.abs(hash));

    const hStats = teamStats[home] || { att: 1.0, def: 1.0, discipline: { rc_prob: 0, yc_avg: 1.5 } };
    const aStats = teamStats[away] || { att: 1.0, def: 1.0, discipline: { rc_prob: 0, yc_avg: 1.5 } };
    const AVG_H = 1.35; const AVG_A = 1.15;

    let exp_h = hStats.att * aStats.def * AVG_H;
    let exp_a = aStats.att * hStats.def * AVG_A;

    // Mood
    const round_mood = 0.9 + (random() * 0.2);
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

    // 1. Determine Winner first (most robust)
    const bestOutcome = Object.keys(winCounts).reduce((a, b) => winCounts[a] > winCounts[b] ? a : b);

    // 2. Find Best Score consistently
    // Filter scores that match the bestOutcome
    const validScores = Object.keys(scoreCounts).filter(s => {
        const [h, a] = s.split('-').map(Number);
        if (bestOutcome === '1') return h > a;
        if (bestOutcome === '2') return a > h;
        return h === a;
    });

    let bestScore = "0-0";
    if (validScores.length > 0) {
        bestScore = validScores.reduce((a, b) => scoreCounts[a] > scoreCounts[b] ? a : b);
    } else {
        // Fallback if no simulation produced the outcome (rare but possible in low iterations)
        // picking global best score
        bestScore = Object.keys(scoreCounts).reduce((a, b) => scoreCounts[a] > scoreCounts[b] ? a : b);
    }

    let winnerLabel = "Nul";
    if (bestOutcome === '1') winnerLabel = home;
    if (bestOutcome === '2') winnerLabel = away;

    const w_conf = Math.round((winCounts[bestOutcome] / ITERATIONS) * 100);
    const probOver = over25 / ITERATIONS;

    // Consistent Goals Label
    // If score is 3-0, goals MUST be +2.5? Not necessarily, prediction is probabilistic.
    // But usually user expects "2-1 implies +2.5".
    // Let's decide Goals Label based on Probabilities (keep separate, it's more informative).
    const goals_label = probOver > 0.5 ? "+2.5 Buts" : "-2.5 Buts";
    const goals_conf = Math.round((probOver > 0.5 ? probOver : 1 - probOver) * 100);

    let advice = "Les deux marquent (BTTS)";
    if (winCounts['1'] / ITERATIONS > 0.6) advice = `Victoire ${home}`;
    else if (winCounts['2'] / ITERATIONS > 0.6) advice = `Victoire ${away}`;

    // --- RED CARD ANALYSIS ---
    let h_risk = hStats.discipline ? (hStats.discipline.rc_prob || 0) : 0;
    let a_risk = aStats.discipline ? (aStats.discipline.rc_prob || 0) : 0;

    if (hStats.discipline) {
        if (aStats.att > 1.2 && hStats.discipline.cards_vs_strong > hStats.discipline.cards_vs_weak) h_risk *= 1.3;
        if (hStats.discipline.cards_2h > hStats.discipline.cards_1h * 1.5) h_risk *= 1.1;
    }
    if (aStats.discipline) {
        if (hStats.att > 1.2 && aStats.discipline.cards_vs_strong > aStats.discipline.cards_vs_weak) a_risk *= 1.3;
        if (aStats.discipline.cards_2h > aStats.discipline.cards_1h * 1.5) a_risk *= 1.1;
    }

    const match_rc_prob = h_risk + a_risk - (h_risk * a_risk);
    const rc_percent = Math.min(99, Math.round(match_rc_prob * 100));

    if (match_rc_prob > 0.3) advice += " - Risque Exclusion";

    return {
        score: bestScore,
        score_conf: Math.round((scoreCounts[bestScore] / ITERATIONS) * 100),
        winner: winnerLabel, winner_conf: w_conf,
        goals_pred: goals_label, goals_conf,
        confidence: w_conf, advice,
        red_card_prob: rc_percent
    };
}

function cleanTeamName(name) {
    if (!name) return "Unknown";
    name = name.trim();
    if (name.toLowerCase().includes('saint-etienne') || name.toLowerCase().includes('st etienne')) return 'Saint-Étienne';
    if (name.toLowerCase() === 'psg' || name.toLowerCase().includes('paris sg')) return 'PSG';
    return name;
}

function run() {
    console.log("Starting Backfill of Predictions History...");

    // 1. Load Data
    const fullHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    const appData = JSON.parse(fs.readFileSync(APP_DATA_FILE, 'utf-8'));
    const fullSchedule = appData.fullSchedule || [];

    // Determine Max Week
    let maxWeek = 0;
    fullSchedule.forEach(m => {
        if (m.week > maxWeek) maxWeek = m.week;
    });

    const snapshots = [];

    // 2. Iterate through each week to simulate "being there"
    // We start at Week 3 to have some data
    for (let simWeek = 3; simWeek <= maxWeek; simWeek++) {
        console.log(`Simulating Snapshot after Week ${simWeek}...`);

        // A. Filter History: Only matches played UP TO simWeek
        // We assume fullHistory represents the "True Past".
        // Use a simple heuristic: matches in 'Journée X' where X <= simWeek
        const relevantHistory = fullHistory.filter(m => {
            const roundMatch = m.round ? m.round.match(/\d+/) : null;
            if (!roundMatch) return false;
            return parseInt(roundMatch[0]) <= simWeek;
        });

        // B. Calculate Stats based on this partial history
        const statsBase = {};
        const processMatch = (h, a, hg, ag) => {
            h = cleanTeamName(h); a = cleanTeamName(a);
            if (!statsBase[h]) statsBase[h] = { gf: 0, ga: 0, p: 0 };
            if (!statsBase[a]) statsBase[a] = { gf: 0, ga: 0, p: 0 };
            statsBase[h].gf += hg; statsBase[h].ga += ag; statsBase[h].p++;
            statsBase[a].gf += ag; statsBase[a].ga += hg; statsBase[a].p++;
        };

        relevantHistory.forEach(m => {
            if (m.score && m.score.includes('-')) {
                const [hg, ag] = m.score.split('-').map(Number);
                processMatch(m.homeTeam, m.awayTeam, hg, ag);
            }
        });

        // Simplified Discipline (skipping detailed discipline backfill for speed, using base risk)
        const finalStats = {};
        Object.keys(statsBase).forEach(t => {
            const s = statsBase[t];
            const p = Math.max(1, s.p);
            finalStats[t] = {
                att: (s.gf / p) / 1.35,
                def: (s.ga / p) / 1.35,
                discipline: { rc_prob: 0.1 } // Default risk
            };
        });

        // C. Generate Predictions for Future Matches (simWeek + 1 onwards)
        const predictions = [];

        fullSchedule.forEach(m => {
            const roundNum = m.week;

            // We only predict future rounds relative to simWeek
            if (roundNum > simWeek) {
                const h = cleanTeamName(m.homeTeam);
                const a = cleanTeamName(m.awayTeam);

                if (h !== "Unknown" && a !== "Unknown") {
                    const pred = predictMatch(h, a, finalStats, roundNum);
                    predictions.push({
                        id: m.id,
                        week: roundNum,
                        home: h,
                        away: a,
                        prediction: pred
                    });
                }
            }
        });

        snapshots.push({
            sourceWeek: simWeek,
            timestamp: Date.now(), // Mock timestamp
            predictions: predictions
        });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(snapshots, null, 2));
    console.log(`Saved ${snapshots.length} snapshots to ${OUTPUT_FILE}`);
}

run();
