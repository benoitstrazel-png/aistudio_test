import fs from 'fs';
import path from 'path';

const HISTORY_FILE = './src/data/matches_history_detailed.json';
const APP_DATA_FILE = './src/data/app_data.json';
const PLAYERS_FILE = './src/data/players.json';

const history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
const appData = JSON.parse(fs.readFileSync(APP_DATA_FILE, 'utf8'));
const players = JSON.parse(fs.readFileSync(PLAYERS_FILE, 'utf8'));

const teamStats = {};

// Initialize teams
const teams = new Set();
history.forEach(m => { teams.add(m.homeTeam); teams.add(m.awayTeam); });
teams.forEach(t => {
    teamStats[t] = {
        name: t,
        goalsScored: 0,
        goalsConceded: 0,
        matches: 0,
        wins: 0,
        winsMargin2Plus: 0,
        totalPoints: 0,
        cleanSheets: 0,
        topScorerGoals: 0,
        totalTeamGoals: 0,
        squadDependency: 0
    };
});

// 1. Process History for Margins and Goals
history.forEach(m => {
    const [gh, ga] = m.score.split('-').map(Number);
    const home = m.homeTeam;
    const away = m.awayTeam;

    teamStats[home].matches++;
    teamStats[away].matches++;
    teamStats[home].goalsScored += gh;
    teamStats[home].goalsConceded += ga;
    teamStats[away].goalsScored += ga;
    teamStats[away].goalsConceded += gh;

    if (gh > ga) {
        teamStats[home].wins++;
        teamStats[home].totalPoints += 3;
        if (gh - ga >= 2) teamStats[home].winsMargin2Plus++;
    } else if (ga > gh) {
        teamStats[away].wins++;
        teamStats[away].totalPoints += 3;
        if (ga - gh >= 2) teamStats[away].winsMargin2Plus++;
    } else {
        teamStats[home].totalPoints += 1;
        teamStats[away].totalPoints += 1;
    }

    if (ga === 0) teamStats[home].cleanSheets++;
    if (gh === 0) teamStats[away].cleanSheets++;
});

// 2. Squad Dependency (Top scorer contribution)
// Group players by team
const teamPlayers = {};
players.forEach(p => {
    if (!teamPlayers[p.team]) teamPlayers[p.team] = [];
    teamPlayers[p.team].push(p);
});

Object.keys(teamStats).forEach(t => {
    if (teamPlayers[t]) {
        const sorted = [...teamPlayers[t]].sort((a, b) => (b.goals || 0) - (a.goals || 0));
        const totalGoals = teamPlayers[t].reduce((sum, p) => sum + (p.goals || 0), 0);
        const topScorer = sorted[0]?.goals || 0;
        teamStats[t].totalTeamGoals = totalGoals;
        teamStats[t].topScorerGoals = topScorer;
        teamStats[t].squadDependency = totalGoals > 0 ? (topScorer / totalGoals) : 0;
    }
});

// 3. Normalization & KPIs
const clustersData = Object.values(teamStats).map(s => {
    const avgScore = s.goalsScored / s.matches;
    const avgConcede = s.goalsConceded / s.matches;
    const winRate = s.wins / s.matches;
    const crushRate = s.winsMargin2Plus / s.matches; // Capability to win by >1 goal

    return {
        team: s.name,
        offense: avgScore.toFixed(2),
        defense: avgConcede.toFixed(2),
        crushRate: crushRate.toFixed(2),
        dependency: s.squadDependency.toFixed(2),
        pointsPerMatch: (s.totalPoints / s.matches).toFixed(2)
    };
});

console.log(JSON.stringify(clustersData, null, 2));
