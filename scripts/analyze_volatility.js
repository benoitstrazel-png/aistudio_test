import fs from 'fs';
import path from 'path';

const HISTORY_FILE = './src/data/matches_history_detailed.json';

if (!fs.existsSync(HISTORY_FILE)) {
    console.error("History file not found.");
    process.exit(1);
}

const history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));

// 1. Group by Round/Matchday
const rounds = {};
history.forEach(m => {
    const round = m.round || "Unknown";
    if (!rounds[round]) rounds[round] = { goals: 0, matches: 0, teams: new Set() };
    const goals = m.score.split('-').map(Number).reduce((a, b) => a + b, 0);
    rounds[round].goals += goals;
    rounds[round].matches += 1;
});

console.log("--- Goals per Matchday (History) ---");
const stats = Object.entries(rounds)
    .filter(([name]) => name.startsWith("Journée"))
    .map(([name, data]) => ({
        name,
        num: parseInt(name.replace("Journée ", "")),
        goals: data.goals,
        avg: (data.goals / data.matches).toFixed(2)
    }))
    .sort((a, b) => a.num - b.num);

stats.forEach(s => console.log(`${s.name}: ${s.goals} goals (Avg: ${s.avg})`));

const allGoals = stats.map(s => s.goals);
const mean = allGoals.reduce((a, b) => a + b, 0) / allGoals.length;
const variance = allGoals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / allGoals.length;
const stdDev = Math.sqrt(variance);

console.log(`\nMean: ${mean.toFixed(2)}`);
console.log(`Std Dev: ${stdDev.toFixed(2)}`);

// 2. Correlation - European Teams
// Focus on J4, J5, J7, J10, J12, J15 which were shortly after European nights
const jPostEuro = [4, 5, 7, 8, 10, 11, 13, 14, 16];

console.log("\n--- Post-European / Busy Calendar Analysis ---");
stats.forEach(s => {
    const mark = jPostEuro.includes(s.num) ? "[BUSY WEEK]" : "           ";
    console.log(`${s.name}: ${s.goals} ${mark} (Diff to mean: ${(s.goals - mean).toFixed(1)})`);
});

const busyMean = stats.filter(s => jPostEuro.includes(s.num)).reduce((a, b) => a + b.goals, 0) / jPostEuro.length;
const normalMean = stats.filter(s => !jPostEuro.includes(s.num)).reduce((a, b) => a + b.goals, 0) / (stats.length - jPostEuro.length);

console.log(`\nAverage Goals in Busy Weeks: ${busyMean.toFixed(2)}`);
console.log(`Average Goals in Normal Weeks: ${normalMean.toFixed(2)}`);
