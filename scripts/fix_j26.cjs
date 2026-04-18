const fs = require('fs');
const file = 'src/data/matches_urls_2025_2026.json';
let data = JSON.parse(fs.readFileSync(file));

// Remove J27 and beyond
data = data.filter(d => {
    const r = parseInt(d.round.replace('Journée ', ''));
    return r <= 26;
});

// Fix PSG - Nantes J26
const j26 = data.find(d => d.round === 'Journée 26');
if (j26) {
    const m = j26.matches.find(x => x.id === 'ED38z4iM' || x.home === 'PSG');
    if (m) {
        m.date = '22.04. 21:00';
        m.timestamp = 1776884400000;
        console.log('Updated PSG-Nantes match');
    }
}

fs.writeFileSync(file, JSON.stringify(data, null, 4));
console.log('Saved matches urls.');
