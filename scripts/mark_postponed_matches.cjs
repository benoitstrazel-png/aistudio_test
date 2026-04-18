
/**
 * mark_postponed_matches.cjs
 * 
 * Marks postponed matches in app_data.json as status: "POSTPONED"
 * so the simulation engine (calculateStandingsAtWeek) skips them
 * when computing standings for past weeks.
 * 
 * Postponed matches known as of 2026-04-18:
 * - J26: PSG vs Nantes (rescheduled to 22/04)
 * - J29: Lens vs PSG (rescheduled to 13/05)
 * - J29: Brest vs Strasbourg (rescheduled to 13/05)
 */

const fs = require('fs');
const path = require('path');

const APP_FILE = path.join(__dirname, '../src/data/app_data.json');

const POSTPONED_IDS = [
    'ED38z4iM', // J26: PSG vs Nantes (22/04)
    'vXzxUeVr', // J29: Lens vs PSG (13/05)
    'ba03FdGk', // J29: Brest vs Strasbourg (13/05)
];

const app = JSON.parse(fs.readFileSync(APP_FILE, 'utf-8'));

let count = 0;
app.fullSchedule.forEach(m => {
    if (POSTPONED_IDS.includes(m.id)) {
        const prev = m.status;
        m.status = 'POSTPONED';
        console.log(`[POSTPONED] J${m.week}: ${m.homeTeam} vs ${m.awayTeam} (was: ${prev})`);
        count++;
    }
});

// Also mark in the standings source if needed - the calc script uses matches_history_detailed
// so we only need to update app_data.json fullSchedule

fs.writeFileSync(APP_FILE, JSON.stringify(app, null, 2));
console.log(`\nDone. ${count} matches marked as POSTPONED.`);
