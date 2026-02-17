
const fs = require('fs');
const path = require('path');

const FILE1 = path.join(__dirname, '../src/data/matches_urls_part1.json');
const FILE2 = path.join(__dirname, '../src/data/matches_urls_part2.json');
const OUT_FILE = path.join(__dirname, '../src/data/matches_urls_2025_2026.json');

function parseDate(dateStr) {
    if (!dateStr || dateStr.length < 5) return 0;
    // Format "17.08. 20:45"
    let [dayPart, timePart] = dateStr.split(' '); // ["17.08.", "20:45"] but Flashscore can be trickier
    if (!timePart) return 0; // TBD match?

    // Sometimes "17.08." comes as "17.08."
    const [d, m] = dayPart.split('.').map(s => parseInt(s));

    // Guess Year
    let year = 2026;
    if (m >= 8) year = 2025;

    const [h, min] = timePart.split(':').map(s => parseInt(s));

    return new Date(year, m - 1, d, h, min).getTime();
}

function run() {
    let data1 = [], data2 = [];
    if (fs.existsSync(FILE1)) data1 = JSON.parse(fs.readFileSync(FILE1, 'utf-8'));
    if (fs.existsSync(FILE2)) data2 = JSON.parse(fs.readFileSync(FILE2, 'utf-8'));

    console.log(`Part1: ${data1.length} rounds. Part2: ${data2.length} rounds.`);

    const roundsMap = new Map();

    const process = (list) => {
        list.forEach(r => {
            if (!r.round.includes('Journée')) return;
            // Clean round name? Usually fine.
            // Check matches
            r.matches.forEach(m => {
                // Enrich URLs
                if (!m.statsUrl) m.statsUrl = `https://www.flashscore.fr/match/${m.id}/#/statistiques-du-match/0`;
                if (!m.statsUrlFirstHalf) m.statsUrlFirstHalf = `https://www.flashscore.fr/match/${m.id}/#/statistiques-du-match/1`;
                if (!m.statsUrlSecondHalf) m.statsUrlSecondHalf = `https://www.flashscore.fr/match/${m.id}/#/statistiques-du-match/2`;

                // Timestamp
                if (!m.timestamp) m.timestamp = parseDate(m.date);
            });

            roundsMap.set(r.round, r); // Later overrides earlier (Fixtures vs Results overlap?)
            // If overlap, usually Results is better because it has confirmed time/status. 
            // Results is Part1.
            // So process Part 2 FIRST, then Part 1.
        });
    };

    process(data2); // Fixtures first
    process(data1); // Results override

    const merged = Array.from(roundsMap.values());

    // Sort
    merged.sort((a, b) => {
        const na = parseInt(a.round.match(/\d+/)[0]);
        const nb = parseInt(b.round.match(/\d+/)[0]);
        return na - nb;
    });

    console.log(`Merged Total: ${merged.length} rounds.`);
    merged.forEach(r => console.log(` ${r.round}: ${r.matches.length} matches`));

    fs.writeFileSync(OUT_FILE, JSON.stringify(merged, null, 2));
    console.log("Saved matches_urls_2025_2026.json");
}

run();
