const fs = require('fs');
const lineups = require('./src/data/lineups_2025_2026.json');

const targets = ["Castillo", "Del Castillo", "Chotard", "Doumbia", "Lala", "Martin"];
const stats = {};

lineups.forEach(m => {
    // Check if Brest
    const isBrest = m.teams.home.includes('Brest') || m.teams.away.includes('Brest');
    if (!isBrest) return;

    if (m.teams.home.includes('Brest')) {
        m.lineups.homeStarters.forEach(p => {
            stats[p] = (stats[p] || 0) + 1;
        });
    } else {
        m.lineups.awayStarters.forEach(p => {
            stats[p] = (stats[p] || 0) + 1;
        });
    }
});

console.log("--- START STATS ---");
Object.entries(stats).forEach(([name, count]) => {
    const n = name.toLowerCase();
    if (targets.some(t => n.includes(t.toLowerCase()))) {
        console.log(` PLAYER: "${name}" | STARTS: ${count}`);
    }
});
console.log("--- END STATS ---");
