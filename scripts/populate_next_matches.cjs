const fs = require('fs');
const FILE = 'src/data/app_data.json';
const appData = JSON.parse(fs.readFileSync(FILE, 'utf-8'));

const currentWeek = appData.currentWeek || 1;
const upcoming = appData.fullSchedule
    .filter(m => m.status === 'SCHEDULED' && m.week >= currentWeek)
    .sort((a,b) => {
        if(a.week !== b.week) return a.week - b.week;
        return a.timestamp - b.timestamp;
    });

appData.nextMatches = upcoming.slice(0, 9);
fs.writeFileSync(FILE, JSON.stringify(appData, null, 2));
console.log('Populated nextMatches with ' + appData.nextMatches.length + ' matches.');
