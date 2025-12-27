import { PLAYERS_DB } from '../data/players_static';
import { getTeamLogo } from '../utils/logos';

// Helper to normalize values between 0 and 100
const normalize = (val, min, max) => {
    if (max === min) return 50;
    return ((val - min) / (max - min)) * 100;
};

export const calculateClusters = (teams, standings, teamStats, playerData = []) => {
    // 1. Aggregation Phase
    const teamData = teams.map(teamName => {
        // Standings Data
        const teamStanding = standings.find(s => s.team === teamName) || {};

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

        // 1.2 Defensive Solidty Proxy from Keeper/Defenders
        // Filter players with "Defender" or "Goalkeeper" roles? 
        // Simplified: Use teamDef parameter (simulated) inverse

        return {
            name: teamName,
            img: getTeamLogo(teamName),
            attParam: stats.att,
            defParam: stats.def,
            starPower: top3Form || 5, // 0-10 scale
            offensiveOutput: totalGoals,
            goalsAgainst: teamStanding.goalsAgainst || 0
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
        // 40% Sim Model (AttParam) + 40% Star Power (Form) + 20% Random/Var
        const normAtt = normalize(team.attParam, minAtt, maxAtt);
        const normStar = normalize(team.starPower, minStar, maxStar);

        const offScore = (normAtt * 0.50) + (normStar * 0.50);

        // DEFENSIVE SCORE (X-Axis)
        // High Def Param = Bad Defense in our Sim? Actually usually high rating = good.
        // Let's assume Sim stats: att (0-100), def (0-100). 
        // We want X-Axis to be "Solidité Défensive". So High is Good.

        const normDef = normalize(team.defParam, minDef, maxDef);
        // Add a bit of historical weight?
        const defScore = normDef;

        return {
            ...team,
            x: defScore, // Defense
            y: offScore, // Offense
            size: team.starPower * 40 // Bubble size = Star Form
        };
    });

    // 4. Define Clusters (7 Distinct Groups)
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
