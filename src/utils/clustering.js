import { PLAYERS_DB } from '../data/players_static';
import { getTeamLogo } from '../utils/logos';

// Helper to normalize values between 0 and 100
const normalize = (val, min, max) => {
    if (max === min) return 50;
    return ((val - min) / (max - min)) * 100;
};

export const calculateClusters = (teams, standings, teamStats) => {
    // 1. Aggregation Phase
    const teamData = teams.map(teamName => {
        // Standings Data
        const teamStanding = standings.find(s => s.team === teamName) || {};
        const goalsFor = teamStanding.goalsFor || 0;
        const goalsAgainst = teamStanding.goalsAgainst || 0;

        // Let's rely on teamStats (parameters) + Aggregated Player Stats for a "Signature"
        const stats = teamStats[teamName] || { att: 1, def: 1 };

        // Aggregate Player Stats (xG, Gls)
        // Normalize team name for lookup
        const normalizeName = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
        const target = normalizeName(teamName);

        const teamPlayers = PLAYERS_DB.filter(p => {
            const squad = normalizeName(p.Squad);
            // Handle "Paris S-G" vs "PSG"
            if (target === 'psg' && squad.includes('paris')) return true;
            return squad.includes(target) || target.includes(squad);
        });

        const totalxG = teamPlayers.reduce((acc, p) => acc + (p.xG || 0), 0);
        const totalGoals = teamPlayers.reduce((acc, p) => acc + (p.Gls || 0), 0); // Real goals from players

        // Stat: "Clinical" (Goals > xG)
        const efficiency = totalxG > 0 ? (totalGoals / totalxG) : 1;

        return {
            name: teamName,
            img: getTeamLogo(teamName),
            attParam: stats.att,
            defParam: stats.def,
            totalxG,
            totalGoals,
            goalsFor,
            goalsAgainst,
            efficiency
        };
    });

    // 2. Normalization Bounds
    const maxAtt = Math.max(...teamData.map(t => t.attParam));
    const minAtt = Math.min(...teamData.map(t => t.attParam));
    const maxDef = Math.max(...teamData.map(t => t.defParam)); // Higher is worse usually
    const minDef = Math.min(...teamData.map(t => t.defParam));

    // Use Total xG as primary offensive metric (more predictive than pure goals over short term)
    const maxXG = Math.max(...teamData.map(t => t.totalxG));
    const minXG = Math.min(...teamData.map(t => t.totalxG));

    // Use Goals Against for defense
    const maxGA = Math.max(...teamData.map(t => t.goalsAgainst));
    const minGA = Math.min(...teamData.map(t => t.goalsAgainst));

    // 3. Scoring & Clustering
    const scoredTeams = teamData.map(team => {
        // Offensive Score: 85% Current (xG) + 15% Model (Att Param)
        const normXG = normalize(team.totalxG, minXG, maxXG);
        const normAtt = normalize(team.attParam, minAtt, maxAtt);

        const offScore = (normXG * 0.85) + (normAtt * 0.15);

        // Defensive Score: 85% Current (Goals Against) + 15% Model (Def Param)
        // High GA = Bad Defense = Low Score
        let normGA = 50;
        if (maxGA !== minGA) {
            normGA = 100 - ((team.goalsAgainst - minGA) / (maxGA - minGA)) * 100;
        } else {
            normGA = 50; // No range
        }

        // High Def Param = Bad Defense (usually) = Low Score
        const normDefParam = 100 - normalize(team.defParam, minDef, maxDef);

        const defScore = (normGA * 0.85) + (normDefParam * 0.15);

        return {
            ...team,
            x: defScore, // X-Axis: Defense
            y: offScore, // Y-Axis: Offense
            size: team.efficiency * 10
        };
    });

    // 4. Define Clusters (Heuristic Quadrants)
    // We can use K-Means, but fixed semantic regions are better for "profiling"
    const result = scoredTeams.map(team => {
        let cluster = '';
        let color = '';

        /*
            Map:
            High Offense, High Defense -> "Élite / Favoris"
            High Offense, Low Defense -> "Spectaculaires" (Glass Cannons)
            Low Offense, High Defense -> "Verrous" (Defensive/Boring)
            Low Offense, Low Defense -> "En Danger"
        */

        const avgOff = 50;
        const avgDef = 50;

        if (team.y > 60 && team.x > 60) {
            cluster = 'Candidats au Titre';
            color = '#CEF002'; // Brand Yellow
        } else if (team.y > 60 && team.x <= 60) {
            cluster = 'Attaque de Feu';
            color = '#f472b6'; // Pink
        } else if (team.y <= 40 && team.x > 60) {
            cluster = 'Blocs Murs';
            color = '#38bdf8'; // Blue
        } else if (team.y < 30 && team.x < 30) {
            cluster = 'Zone Rouge';
            color = '#ef4444'; // Red
        } else {
            cluster = 'Ventre Mou / Équilibrés';
            color = '#94a3b8'; // Slate
        }

        return { ...team, cluster, color };
    });

    return result;
};
