const fs = require('fs');

const stats = JSON.parse(fs.readFileSync('./src/data/player_stats_calculated.json'));
let potentialCoaches = [];

Object.values(stats).forEach(team => {
    team.forEach(p => {
        if (p.matchesPlayed === 0 && p.starter === 0 && p.subIn === 0 && p.minutesPlayed === 0) {
            potentialCoaches.push(`${p.name} (${p.team}): Goals ${p.goals}, Assists ${p.assists}, YC ${p.yellowCards}, RC ${p.redCards}`);
        }
    });
});

console.log("Potential coaches/staff (0 minutes played):");
potentialCoaches.forEach(p => console.log(p));
