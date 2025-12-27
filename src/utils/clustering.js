import { PLAYERS_DB } from '../data/players_static';
import { getTeamLogo } from '../utils/logos';

// Helper to normalize values between 0 and 100
const normalize = (val, min, max) => {
    if (max === min) return 50;
    return ((val - min) / (max - min)) * 100;
};

// Helper: Calculate Standings from Schedule
const calculateStandings = (teams, schedule) => {
    const standings = {};
    teams.forEach(t => standings[t] = { points: 0, matches: 0 });

    schedule.forEach(m => {
        if (m.status !== 'FINISHED' || !m.score) return;
        const h = m.homeTeam;
        const a = m.awayTeam;
        if (!standings[h] || !standings[a]) return;

        const hs = m.score.home;
        const as = m.score.away;

        standings[h].matches++;
        standings[a].matches++;

        if (hs > as) standings[h].points += 3;
        else if (as > hs) standings[a].points += 3;
        else {
            standings[h].points += 1;
            standings[a].points += 1;
        }
    });

    return Object.entries(standings)
        .sort(([, a], [, b]) => b.points - a.points)
        .map(([team, stats], index) => ({ team, ...stats, rank: index + 1 }));
};

export const calculateClusters = (teams, _unusedStandings, teamStats, playerData = [], schedule = []) => {
    // 0. Pre-calculation: Live Standings & Tiers
    // If schedule is empty, this won't work perfectly, but handles initial load
    const liveStandings = calculateStandings(teams, schedule);
    const topTier = liveStandings.slice(0, 6).map(s => s.team);
    const midTier = liveStandings.slice(6, 12).map(s => s.team);
    const lowTier = liveStandings.slice(12, 18).map(s => s.team); // Assuming 18 teams

    const getOpponentTier = (oppName) => {
        if (topTier.includes(oppName)) return 'TOP';
        if (lowTier.includes(oppName)) return 'LOW';
        return 'MID';
    };

    // 1. Aggregation Phase
    const teamData = teams.map(teamName => {
        // Standings Data
        // Use liveStandings if available, else fallback (though calculateStandings handles empty schedule)
        const teamStanding = liveStandings.find(s => s.team === teamName) || { points: 0 };

        // Let's rely on teamStats (parameters) + Aggregated Player Stats for a "Signature"
        const stats = teamStats[teamName] || { att: 1, def: 1 };

        // Aggregate Player Stats
        const normalizeName = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
        const target = normalizeName(teamName);

        // Fallback to static DB if playerData not provided or empty
        const sourceData = (playerData && playerData.length > 0) ? playerData : PLAYERS_DB;

        const teamPlayers = sourceData.filter(p => {
            const squad = normalizeName(p.team || p.Squad || "");
            // Handle "Paris S-G" vs "PSG"
            if (target === 'psg' && squad.includes('paris')) return true;
            return squad.includes(target) || target.includes(squad);
        });

        // 1.1 Team Power Aggregates
        const totalGoals = teamPlayers.reduce((acc, p) => acc + (p.chanceGoal || (p.Gls * 5) || 0), 0); // Weighted chance or goals
        // Use "Form" -> avg of top 3 players (Star Power)
        const sortedByForm = [...teamPlayers].sort((a, b) => (b.form || 0) - (a.form || 0));
        const top3Form = sortedByForm.slice(0, 3).reduce((acc, p) => acc + (p.form || 5), 0) / 3;

        // 1.2 "Mental Strength" / Versatility Calculation
        // Iterate matches to find performance vs Tiers
        let ptsVsTop = 0;
        let gamesVsTop = 0;

        // Note: We only care about finished matches for "Mental Strength"
        schedule.filter(m => m.status === 'FINISHED' && (m.homeTeam === teamName || m.awayTeam === teamName)).forEach(m => {
            const isHome = m.homeTeam === teamName;
            const opponent = isHome ? m.awayTeam : m.homeTeam;
            const oppTier = getOpponentTier(opponent);

            // Only tracking VS TOP for "Big Game Player" bonification

            const myScore = isHome ? m.score.home : m.score.away;
            const oppScore = isHome ? m.score.away : m.score.home;

            let pts = 0;
            if (myScore > oppScore) pts = 3;
            else if (myScore === oppScore) pts = 1;

            if (oppTier === 'TOP') {
                ptsVsTop += pts;
                gamesVsTop++;
            }
        });

        // Giant Killer Score (0-100)
        // If 0 games played vs top, assume neutral 50
        const giantKillerScore = gamesVsTop > 0 ? (ptsVsTop / (gamesVsTop * 3)) * 100 : 50;

        // Pass teamDef param directly as we don't calculate GA in helper yet
        // Ideally we would, but keeping it simple to minimize risk.
        // We will assume 'teamStanding' has goalsAgainst if passed, but it doesn't from calculateStandings.
        // So we fallback to stats.def or 0.
        // Wait, 'calculateStandings' didn't calculate GA. 
        // Let's rely on teamStats.def for X-Axis primarily.

        return {
            name: teamName,
            img: getTeamLogo(teamName),
            attParam: stats.att,
            defParam: stats.def,
            starPower: top3Form || 5, // 0-10 scale
            offensiveOutput: totalGoals,
            goalsAgainst: 0, // Placeholder, using defParam anyway
            giantKillerScore
        };
    });

    // 2. Normalization Bounds
    const maxAtt = Math.max(...teamData.map(t => t.attParam));
    const minAtt = Math.min(...teamData.map(t => t.attParam));

    // Star Power Bounds
    const maxStar = Math.max(...teamData.map(t => t.starPower));
    const minStar = Math.min(...teamData.map(t => t.starPower));

    // Def Bounds
    const maxDef = Math.max(...teamData.map(t => t.defParam));
    const minDef = Math.min(...teamData.map(t => t.defParam));

    // 3. Scoring & Clustering
    const scoredTeams = teamData.map(team => {
        // OFFENSIVE SCORE (Y-Axis)
        // 40% Sim Model + 40% Star Power + 20% "Mental/GiantKiller"
        // This rewards teams that perform in big games
        const normAtt = normalize(team.attParam, minAtt, maxAtt);
        const normStar = normalize(team.starPower, minStar, maxStar);

        // Mental Strength is already 0-100 based on PPG vs Top
        const mental = team.giantKillerScore;

        const offScore = (normAtt * 0.40) + (normStar * 0.40) + (mental * 0.20);

        // DEFENSIVE SCORE (X-Axis)
        // High Def Param = Bad Defense in our Sim? Actually usually high rating = good.
        // Let's assume Sim stats: att (0-100), def (0-100). 
        // We want X-Axis to be "Solidité Défensive". So High is Good.
        // Note: For defParam, typically higher is better defense.

        const normDef = normalize(team.defParam, minDef, maxDef);
        const defScore = normDef;

        return {
            ...team,
            x: defScore, // Defense
            y: offScore, // Offense
            size: team.starPower * 40 // Bubble size = Star Form
        };
    });

    // 4. Define Clusters (7 Distinct Groups)
    // Same logic as before
    const result = scoredTeams.map(team => {
        let cluster = '';
        let color = '';

        /*
            Y (Att) ^
            | [3] [2] [1]
            | [6] [5] [4]
            | [7]
            -----------------> X (Def)
        */

        const x = team.x; // Def
        const y = team.y; // Att

        if (x > 70 && y > 70) {
            cluster = '👑 Élites du Championnat';
            color = '#CEF002'; // Yellow
        } else if (x > 60 && y > 55) {
            cluster = '🇪🇺 Prétendants Europe';
            color = '#a855f7'; // Purple
        } else if (x < 50 && y > 65) {
            cluster = '🔥 Attaque de Feu'; // Great attack, weak def
            color = '#f472b6'; // Pink
        } else if (x > 65 && y < 50) {
            cluster = '🛡️ Blocs Compacts'; // Good def, weak att
            color = '#38bdf8'; // Blue
        } else if (x > 40 && x < 65 && y > 40 && y < 65) {
            cluster = '⚖️ Équilibrés / Ventre Mou';
            color = '#94a3b8'; // Slate
        } else if (y < 40 && x > 40) {
            cluster = '📉 Attaque en Panne'; // Decent def, no goals
            color = '#fb923c'; // Orange
        } else {
            cluster = '🚨 Zone Critique'; // Bad everything
            color = '#ef4444'; // Red
        }

        return { ...team, cluster, color };
    });

    return result;
};
