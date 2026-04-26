const fs = require('fs');
const rounds = JSON.parse(fs.readFileSync('src/data/matches_urls_2025_2026.json', 'utf-8'));
const history = JSON.parse(fs.readFileSync('src/data/matches_history_detailed.json', 'utf-8'));

const existingUrls = new Set(history.map(m => m.url));
const missing = [];
const missingByRound = {};

rounds.forEach(r => {
    r.matches.forEach(m => {
        if (!existingUrls.has(m.url)) {
            missing.push({ round: r.round, url: m.url });
            missingByRound[r.round] = (missingByRound[r.round] || 0) + 1;
        }
    });
});

console.log(`Total missing: ${missing.length}`);
console.log(missingByRound);
