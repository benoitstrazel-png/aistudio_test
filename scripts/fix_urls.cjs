const fs = require('fs');
const file = 'src/data/matches_urls_2025_2026.json';
let data = JSON.parse(fs.readFileSync(file));

data.forEach(round => {
    round.matches.forEach(m => {
        if (!m.url && m.id) {
            m.url = `https://www.flashscore.fr/match/${m.id}/#/resume`;
        }
    });
});

fs.writeFileSync(file, JSON.stringify(data, null, 4));
console.log('Fixed missing URLs.');
