import { PLAYERS_DB } from '../data/players_static';
import { getTeamLogo } from '../utils/logos';

// Helper to normalize values between 0 and 100
const normalize = (val, min, max) => {
    if (min === max) return 50;
    return ((val - min) / (max - min)) * 100;
};

// Helper: Calculate Standings & Detailed Stats from Schedule
const calculateDetailedStats = (teams, schedule) => {
    const stats = {};
    teams.forEach(t => {
        stats[t] = {
            points: 0, matches: 0,
            goalsFor: 0, goalsAgainst: 0,
            homePoints: 0, homeMatches: 0,
            awayPoints: 0, awayMatches: 0,
            awayGoals: 0,
            draws: 0
        };
    });

    schedule.forEach(m => {
        if (m.status !== 'FINISHED' || !m.score) return;
        const h = m.homeTeam;
        const a = m.awayTeam;
        if (!stats[h] || !stats[a]) return;

        const hs = m.score.home;
        const as = m.score.away;

        // General
        stats[h].matches++;
        stats[a].matches++;
        stats[h].goalsFor += hs;
        stats[h].goalsAgainst += as;
        stats[a].goalsFor += as;
        stats[a].goalsAgainst += hs;

        // Home/Away Specifics
        stats[h].homeMatches++;
        stats[a].awayMatches++;
        stats[a].awayGoals += as;

        // Points
        if (hs > as) {
            stats[h].points += 3;
            stats[h].homePoints += 3;
        } else if (as > hs) {
            stats[a].points += 3;
            stats[a].awayPoints += 3;
        } else {
            stats[h].points += 1;
            stats[h].homePoints += 1;
            stats[a].points += 1;
            stats[a].awayPoints += 1;
            stats[h].draws++;
            stats[a].draws++;
        }
    });

    return stats;
};

export const calculateClusters = (teams, _unused, teamStats, playerData = [], schedule = []) => {
    // 1. Calculate Raw Metrics (The 7 Pillars)
    const rawStats = calculateDetailedStats(teams, schedule);

    const teamMetrics = teams.map(teamName => {
        const s = rawStats[teamName];
        const params = teamStats[teamName] || { att: 50, def: 50 };

        // 1. Attaque (Goals + Param)
        const metricAttack = s.goalsFor + (params.att * 0.5);

        // 2. Défense (Inv Goals + Param)
        // Lower GA is better, so we invert for the metric score later
        const metricDefense = (100 - s.goalsAgainst) + (params.def * 0.5);

        // 3. Différence
        const metricDiff = s.goalsFor - s.goalsAgainst;

        // 4. Domicile (PPG Home)
        const ppgHome = s.homeMatches > 0 ? (s.homePoints / s.homeMatches) : 0;

        // 5. Extérieur (PPG Away)
        const ppgAway = s.awayMatches > 0 ? (s.awayPoints / s.awayMatches) : 0;

        // 6. Résilience (Away Goals % + Draws weight)
        // Ability to score away and hold draws
        const awayGoalRatio = s.goalsFor > 0 ? (s.awayGoals / s.goalsFor) : 0;
        const drawRatio = s.matches > 0 ? (s.draws / s.matches) : 0;
        const metricResilience = (awayGoalRatio * 0.6) + (drawRatio * 0.4);

        // 7. Puissance Joueur (Star Power)
        // Aggregate Player Stats
        const normalizeName = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
        const target = normalizeName(teamName);
        const sourceData = (playerData && playerData.length > 0) ? playerData : PLAYERS_DB;
        const teamPlayers = sourceData.filter(p => {
            const squad = normalizeName(p.team || p.Squad || "");
            if (target === 'psg' && squad.includes('paris')) return true;
            return squad.includes(target) || target.includes(squad);
        });
        const sortedByForm = [...teamPlayers].sort((a, b) => (b.form || 0) - (a.form || 0));
        const starPower = sortedByForm.slice(0, 3).reduce((acc, p) => acc + (p.form || 5), 0) / 3;

        // Per Match Stats for Display
        const matches = s.matches || 1; // Avoid div/0
        const goalsForPm = s.goalsFor / matches;
        const goalsAgainstPm = s.goalsAgainst / matches;
        const goalDiffPm = (s.goalsFor - s.goalsAgainst) / matches;

        return {
            name: teamName,
            img: getTeamLogo(teamName),
            raw: {
                att: metricAttack,
                def: metricDefense,
                diff: metricDiff,
                home: ppgHome,
                away: ppgAway,
                res: metricResilience,
                star: starPower
            },
            displayStats: {
                goalsFor: goalsForPm,
                goalsAgainst: goalsAgainstPm,
                goalDiff: goalDiffPm,
                ppgHome: ppgHome, // Already per match
                ppgAway: ppgAway, // Already per match
                resilience: metricResilience * 100, // Display as score 0-100? Or just ratio? User said "metrics used to calculate". Let's use the raw values but maybe scaled nicely if needed. 
                // metricResilience is 0-1 (ratio * 0.6 + ratio * 0.4). Let's keep it 0-1 or 0-100.
                // In clustering we normalize it. Here let's return the raw value 0-1 roughly.
                // Actually let's multiply by 10 to be readable or just keep raw.
                // Let's keep it as "Score (0-100)" for consistency with other "scores" if we want, OR just raw ratios.
                // User asked for "Moyenne par match". Resilience is slightly abstract. Let's return the calculated metric.
                resilience: metricResilience,
                starPower: starPower
            }
        };
    });

    if (teamMetrics.length === 0) return [];

    // 2. Normalize Metrics (0-100)
    const bounds = {
        att: { min: Math.min(...teamMetrics.map(t => t.raw.att)), max: Math.max(...teamMetrics.map(t => t.raw.att)) },
        def: { min: Math.min(...teamMetrics.map(t => t.raw.def)), max: Math.max(...teamMetrics.map(t => t.raw.def)) },
        diff: { min: Math.min(...teamMetrics.map(t => t.raw.diff)), max: Math.max(...teamMetrics.map(t => t.raw.diff)) },
        home: { min: Math.min(...teamMetrics.map(t => t.raw.home)), max: Math.max(...teamMetrics.map(t => t.raw.home)) },
        away: { min: Math.min(...teamMetrics.map(t => t.raw.away)), max: Math.max(...teamMetrics.map(t => t.raw.away)) },
        res: { min: Math.min(...teamMetrics.map(t => t.raw.res)), max: Math.max(...teamMetrics.map(t => t.raw.res)) },
        star: { min: Math.min(...teamMetrics.map(t => t.raw.star)), max: Math.max(...teamMetrics.map(t => t.raw.star)) },
    };

    const scoredTeams = teamMetrics.map(t => {
        const scores = {
            att: normalize(t.raw.att, bounds.att.min, bounds.att.max),
            def: normalize(t.raw.def, bounds.def.min, bounds.def.max),
            diff: normalize(t.raw.diff, bounds.diff.min, bounds.diff.max),
            home: normalize(t.raw.home, bounds.home.min, bounds.home.max),
            away: normalize(t.raw.away, bounds.away.min, bounds.away.max),
            res: normalize(t.raw.res, bounds.res.min, bounds.res.max),
            star: normalize(t.raw.star, bounds.star.min, bounds.star.max),
        };

        // Global Performance Score (GPS)
        // Weighted average of the 7 metrics
        const gps = (
            scores.att * 0.20 +
            scores.def * 0.20 +
            scores.diff * 0.15 +
            scores.home * 0.10 +
            scores.away * 0.10 +
            scores.res * 0.10 +
            scores.star * 0.15
        );

        // Style Score: > 0 means Offensive Bias, < 0 means Defensive Bias
        const style = scores.att - scores.def;

        return {
            ...t,
            scores,
            gps,
            style,
            // X and Y for Graph
            x: scores.def, // Defense (X)
            y: scores.att, // Offense (Y)
            size: t.raw.star * 40 // Bubble Size
        };
    });

    // 3. Match with Global Clusters or KPI-based Classification
    const result = scoredTeams.map((team) => {
        const params = teamStats[team.name] || {};
        let cluster = params.cluster;
        let color = '#94a3b8'; // Default Slate

        // Mapping colors to new clusters
        const colorMap = {
            'Les Dominateurs': '#CEF002', // Neon Yellow
            'Les Murs': '#38bdf8',       // Sky Blue
            'Les Outsiders Dangereux': '#a855f7', // Purple
            'Combattants du Maintien': '#fb923c', // Orange
            'Le Ventre Mou Cosmopolite': '#94a3b8' // Slate
        };

        if (cluster && colorMap[cluster]) {
            color = colorMap[cluster];
        } else {
            // Fallback to KPI logic if cluster not provided in teamStats
            if (team.scores.att > 75 && team.scores.def > 75) {
                cluster = 'Les Dominateurs';
                color = colorMap[cluster];
            } else if (team.scores.def > 80) {
                cluster = 'Les Murs';
                color = colorMap[cluster];
            } else if (team.scores.att < 30 || team.scores.def < 30) {
                cluster = 'Combattants du Maintien';
                color = colorMap[cluster];
            } else {
                cluster = 'Le Ventre Mou Cosmopolite';
                color = colorMap[cluster];
            }
        }

        return { ...team, cluster, color };
    });

    return result;
};
