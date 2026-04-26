const fs = require('fs');

const APP_FILE = 'src/data/app_data.json';
const HIST_FILE = 'src/data/matches_history_detailed.json';

const app = JSON.parse(fs.readFileSync(APP_FILE, 'utf-8'));
const history = JSON.parse(fs.readFileSync(HIST_FILE, 'utf-8'));

// Calculate currentWeek based on the highest round with played matches
let maxPlayedWeek = 1;
history.forEach(m => {
    if (m.score && m.score !== "-") {
        if (m.round) {
            const weekMatch = m.round.match(/Journée (\d+)/i);
            if (weekMatch) {
                const weekNum = parseInt(weekMatch[1], 10);
                if (weekNum > maxPlayedWeek) {
                    maxPlayedWeek = weekNum;
                }
            }
        }
    }
});
app.currentWeek = maxPlayedWeek;
console.log(`Dynamically set currentWeek to ${app.currentWeek}`);
// Function to normalize team names to match the standings list format exactly
function cleanTeamName(name) {
    if (!name) return "Unknown";
    name = name.trim();
    if (name.toLowerCase().includes('saint-etienne') || name.toLowerCase().includes('st etienne')) return 'Saint-Étienne';
    if (name.toLowerCase() === 'psg' || name.toLowerCase().includes('paris sg')) return 'PSG';
    return name;
}

const teams = {};
history.forEach(m => {
    if (m.score && m.score !== "-") {
        const [hg, ag] = m.score.split('-').map(Number);
        const home = cleanTeamName(m.homeTeam);
        const away = cleanTeamName(m.awayTeam);
        
        if (!teams[home]) teams[home] = { points: 0, played: 0 };
        if (!teams[away]) teams[away] = { points: 0, played: 0 };
        
        teams[home].played++;
        teams[away].played++;
        if (hg > ag) teams[home].points += 3;
        else if (hg < ag) teams[away].points += 3;
        else {
            teams[home].points++;
            teams[away].points++;
        }
    }
});

app.standings = Object.keys(teams)
    .filter(t => t !== "Unknown" && t !== "Generic")
    .map(t => ({
        team: t,
        points: teams[t].points,
        played: teams[t].played,
        projectedPoints: Math.round((teams[t].points / (teams[t].played || 1)) * 34),
        status: "live"
    }))
    .sort((a, b) => b.points - a.points || b.projectedPoints - a.projectedPoints);

// Since J27 is ignored, any match not in history but in fullSchedule? 
// Actually update_dashboard_full.cjs rebuilds fullSchedule and predictions.
// So we just save the standings and let update_dashboard_full.cjs do the rest.

// Clear nextMatches so update_dashboard can recreate it if needed
app.nextMatches = [];

fs.writeFileSync(APP_FILE, JSON.stringify(app, null, 2));
console.log('App Data updated to Week 29 and Standings recalculated.');
