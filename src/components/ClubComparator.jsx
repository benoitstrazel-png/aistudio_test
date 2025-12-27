import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea, ScatterChart, Scatter, ZAxis, Cell } from 'recharts';
import NextMatchRadar from './NextMatchRadar';
import TeamLogo from './ui/TeamLogo';
import { predictMatchLive } from '../utils/prediction';
import { calculateClusters } from '../utils/clustering';
import { PLAYERS_DB } from '../data/players_static';
import PLAYERS_DATA from '../data/players.json'; // Import Player Data source

const ClubComparator = ({ teams, schedule = [], teamStats, currentWeek }) => {
    const [teamA, setTeamA] = useState(teams[0] || 'PSG');
    const [teamB, setTeamB] = useState(teams[1] || 'Marseille');
    const [filterContext, setFilterContext] = useState('all'); // 'all', 'home', 'away'

    // ... (Keep existing Ranking History Logic)

    // 1. CALCULATE RANKING EVOLUTION (Historical + Projected)
    const rankingHistory = useMemo(() => {
        if (!schedule || !Array.isArray(schedule)) return [];

        // Initialize points and goal diffs
        const standings = {};
        teams.forEach(t => {
            standings[t] = { points: 0, gd: 0, goalsFor: 0, goalsAgainst: 0 };
        });

        const history = [];

        // Sort schedule by week to be safe
        const sortedSchedule = [...schedule].sort((a, b) => a.week - b.week);
        const maxWeek = 34; // Ligue 1 18 teams = 34 weeks

        for (let w = 1; w <= maxWeek; w++) {
            const weekMatches = sortedSchedule.filter(m => m.week === w);

            weekMatches.forEach(match => {
                let homeScore, awayScore;

                // Use real result if available
                if (match.status === 'FINISHED' && match.score) {
                    homeScore = match.score.home;
                    awayScore = match.score.away;
                } else {
                    // Start prediction for future matches
                    // We need a determinstic prediction for the graph to be stable
                    // predictMatchLive is deterministic (seeded)
                    const pred = predictMatchLive(match.homeTeam, match.awayTeam, teamStats);
                    if (pred && pred.score) {
                        const parts = pred.score.split('-');
                        homeScore = parseInt(parts[0]);
                        awayScore = parseInt(parts[1]);
                    } else {
                        homeScore = 0; awayScore = 0; // Fallback
                    }
                }

                if (!standings[match.homeTeam] || !standings[match.awayTeam]) return;

                // Update Standings
                standings[match.homeTeam].goalsFor += homeScore;
                standings[match.homeTeam].goalsAgainst += awayScore;
                standings[match.homeTeam].gd += (homeScore - awayScore);

                standings[match.awayTeam].goalsFor += awayScore;
                standings[match.awayTeam].goalsAgainst += homeScore;
                standings[match.awayTeam].gd += (awayScore - homeScore);

                if (homeScore > awayScore) {
                    standings[match.homeTeam].points += 3;
                } else if (awayScore > homeScore) {
                    standings[match.awayTeam].points += 3;
                } else {
                    standings[match.homeTeam].points += 1;
                    standings[match.awayTeam].points += 1;
                }
            });

            // Calculate Ranks for this week
            const sortedTeams = Object.keys(standings).sort((a, b) => {
                if (standings[b].points !== standings[a].points) return standings[b].points - standings[a].points;
                return standings[b].gd - standings[a].gd;
            });

            history.push({
                week: w,
                [teamA]: sortedTeams.indexOf(teamA) + 1,
                [teamB]: sortedTeams.indexOf(teamB) + 1,
            });
        }

        return history;
    }, [schedule, teams, teamA, teamB, teamStats]);

    // 2. CALCULATE PERFORMANCE METRICS
    const metrics = useMemo(() => {
        const calculateMetrics = (team) => {
            const matches = schedule.filter(m => (m.homeTeam === team || m.awayTeam === team) && m.status === 'FINISHED'); // Only Past Matches for granular stats? Or all? User likely wants historical performance.
            // Let's use ONLY finished matches for "Performance" stats (yellow cards etc).
            // NOTE: We don't have card data in JSON. We will mock it deterministically based on match ID.

            let stats = {
                goalsFor: 0,
                goalsAgainst: 0,
                yellowCards: 0,
                redCards: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                matchesPlayed: 0
            };

            const SEED_OFFSET = 12345;
            // Simple LCG for deterministic pseudo-randoms
            const pseudoRandom = (seed) => {
                const x = Math.sin(seed + SEED_OFFSET) * 10000;
                return x - Math.floor(x);
            }

            matches.forEach(m => {
                const isHome = m.homeTeam === team;

                // Filter Logic
                if (filterContext === 'home' && !isHome) return;
                if (filterContext === 'away' && isHome) return;

                const scoreHome = m.score.home;
                const scoreAway = m.score.away;

                const gf = isHome ? scoreHome : scoreAway;
                const ga = isHome ? scoreAway : scoreHome;

                stats.goalsFor += gf;
                stats.goalsAgainst += ga;
                stats.matchesPlayed += 1;

                if (gf > ga) stats.wins++;
                else if (gf < ga) stats.losses++;
                else stats.draws++;

                // Mock Cards
                // Generate deterministic random based on match ID + team name char code sum
                const teamCode = team.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
                const seed = (typeof m.id === 'string' ? m.id.length : m.id) + teamCode;
                const rand = pseudoRandom(seed);

                // ~ 2 yellows per game avg, ~0.1 reds
                stats.yellowCards += Math.floor(rand * 4); // 0 to 3
                stats.redCards += (rand > 0.95 ? 1 : 0);
            });

            return stats;
        };

        return {
            [teamA]: calculateMetrics(teamA),
            [teamB]: calculateMetrics(teamB)
        };
    }, [schedule, teamA, teamB, filterContext]);

    // 3. CALCULATE CLUSTERS
    const clusters = useMemo(() => {
        // Pass PLAYERS_DATA and schedule to calculations
        return calculateClusters(teams, [], teamStats, PLAYERS_DATA, schedule);
    }, [teams, teamStats, schedule]);

    // Format Data for Comparison Bar
    const comparisonData = [
        { label: 'Matchs Joués', key: 'matchesPlayed' },
        { label: 'Victoires', key: 'wins' },
        { label: 'Buts Marqués', key: 'goalsFor' },
        { label: 'Buts Encaissés', key: 'goalsAgainst' },
        { label: 'Cartons Jaunes', key: 'yellowCards' },
        { label: 'Cartons Rouges', key: 'redCards' }
    ];

    const StatRow = ({ label, keyName }) => {
        const valA = metrics[teamA][keyName];
        const valB = metrics[teamB][keyName];
        // Calculate percentages for bar width
        const total = valA + valB;
        const perA = total === 0 ? 50 : (valA / total) * 100;
        const perB = total === 0 ? 50 : (valB / total) * 100;

        return (
            <div className="flex flex-col gap-2 mb-4">
                <div className="flex justify-between text-sm font-bold tracking-widest uppercase text-secondary">
                    <span className={valA > valB ? "text-accent" : ""}>{valA}</span>
                    <span>{label}</span>
                    <span className={valB > valA ? "text-red-500" : ""}>{valB}</span>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden bg-white/10">
                    <div style={{ width: `${perA}%` }} className="bg-accent transition-all duration-500"></div>
                    <div style={{ width: `${perB}%` }} className="bg-red-500 transition-all duration-500"></div>
                </div>
            </div>
        )
    };

    return (
        <div className="space-y-12 animate-in fade-in zoom-in duration-500">

            {/* CONTROLS */}
            <div className="flex flex-col md:flex-row justify-center items-center gap-8 bg-black/20 p-6 rounded-3xl border border-white/5 backdrop-blur-sm">
                {/* TEAM A */}
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <label className="block text-xs font-bold text-accent uppercase mb-1">Équipe A</label>
                        <select
                            value={teamA}
                            onChange={(e) => setTeamA(e.target.value)}
                            className="bg-slate-800 text-white p-2 rounded-lg border border-white/10 font-bold outline-none focus:border-accent"
                        >
                            {teams.map(t => <option key={t} value={t} disabled={t === teamB}>{t}</option>)}
                        </select>
                    </div>
                    <TeamLogo teamName={teamA} size="lg" />
                </div>

                <div className="text-2xl font-black italic text-white/10">VS</div>

                {/* TEAM B */}
                <div className="flex items-center gap-4 flex-row-reverse">
                    <div className="text-left">
                        <label className="block text-xs font-bold text-red-500 uppercase mb-1">Équipe B</label>
                        <select
                            value={teamB}
                            onChange={(e) => setTeamB(e.target.value)}
                            className="bg-slate-800 text-white p-2 rounded-lg border border-white/10 font-bold outline-none focus:border-red-500"
                        >
                            {teams.map(t => <option key={t} value={t} disabled={t === teamA}>{t}</option>)}
                        </select>
                    </div>
                    <TeamLogo teamName={teamB} size="lg" />
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">

                {/* 1. RANKING EVOLUTION CHART */}
                <div className="card p-6 min-h-[400px] flex flex-col col-span-1 lg:col-span-2">
                    <div className="mb-6 text-center">
                        <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                            <span className="text-accent">Trajectoire</span> Saison
                        </h3>
                        <p className="text-secondary text-xs font-bold uppercase tracking-widest">Classement par journée (Historique + Projection)</p>
                    </div>

                    <div className="w-full" style={{ height: '350px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={rankingHistory} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                <XAxis dataKey="week" stroke="#64748b" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                <YAxis reversed={true} domain={[1, teams.length || 18]} stroke="#64748b" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} hide={false} width={30} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />

                                {/* Reference Area for Future (Projected) */}
                                <ReferenceArea x1={currentWeek} x2={34} strokeOpacity={0.3} fill="#ffffff" fillOpacity={0.03} />

                                <Line type="monotone" dataKey={teamA} stroke="#38bdf8" strokeWidth={3} dot={false} activeDot={{ r: 6 }} name={teamA} />
                                <Line type="monotone" dataKey={teamB} stroke="#ef4444" strokeWidth={3} dot={false} activeDot={{ r: 6 }} name={teamB} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 mt-2 text-[10px] text-secondary uppercase font-bold">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-700"></div> Zone Projetée (J{currentWeek}-J34)</span>
                    </div>
                </div>

                {/* 2. RADAR COMPARISON */}
                <div className="card flex flex-col items-center justify-center p-6">
                    <div className="mb-4 text-center">
                        <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Profil Équipe</h3>
                    </div>
                    <div className="w-full">
                        <NextMatchRadar homeTeam={teamA} awayTeam={teamB} teamStats={teamStats} />
                    </div>
                </div>

                {/* 3. CLUSTERING ANALYSIS */}
                <div className="card col-span-1 lg:col-span-2 p-8 bg-[#0f172a] border border-white/5">
                    <div className="text-center mb-8">
                        <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                            <span className="text-accent">Cluster</span> Analysis
                        </h3>
                        <p className="text-secondary text-sm font-bold uppercase tracking-widest">
                            Groupement des clubs par profil de performance (Basé sur stats réelles + Player Stats Model)
                        </p>
                    </div>

                    <div className="flex flex-col gap-6">
                        {/* CHART */}
                        <div className="h-[620px] bg-white/5 rounded-2xl p-4 pb-12 border border-white/5 relative" style={{ height: '620px', overflow: 'hidden' }}>
                            {/* Axis Labels */}
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-accent uppercase tracking-widest bg-black/50 px-2 rounded">
                                ▲ Puissance Offensive
                            </div>
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-red-500 uppercase tracking-widest bg-black/50 px-2 rounded">
                                ▼ Faiblesse Offensive
                            </div>
                            <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-bold text-secondary uppercase tracking-widest whitespace-nowrap">
                                ◀ Fragilité Défensive
                            </div>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-[10px] font-bold text-blue-400 uppercase tracking-widest whitespace-nowrap">
                                Solidité Défensive ▶
                            </div>

                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                    {/* Focus on data points by setting dynamic domain */}
                                    <XAxis type="number" dataKey="x" name="Défense" domain={['dataMin - 5', 'dataMax + 5']} hide />
                                    <YAxis type="number" dataKey="y" name="Attaque" domain={['dataMin - 5', 'dataMax + 5']} hide />
                                    <ZAxis type="number" dataKey="size" range={[60, 450]} name="Star Power" />
                                    {/* Semantic Zones Background removed for clarity with dynamic zoom, reliance on colors now */}

                                    <Tooltip
                                        cursor={{ strokeDasharray: '3 3' }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-slate-900 border border-white/10 p-3 rounded-xl shadow-xl z-50 min-w-[180px]">
                                                        <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-2">
                                                            <div className="flex flex-col">
                                                                <span className="font-black text-white uppercase italic leading-none text-sm">{data.name}</span>
                                                                <span className="text-[10px] font-bold uppercase leading-none mt-1" style={{ color: data.color }}>{data.cluster}</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-secondary space-y-1.5">
                                                            <div className="flex justify-between"><span>Attaque:</span> <span className="text-white font-mono">{Math.round(data.y)}</span></div>
                                                            <div className="flex justify-between"><span>Défense:</span> <span className="text-white font-mono">{Math.round(data.x)}</span></div>
                                                            <div className="flex justify-between"><span className="text-accent">Star Power:</span> <span className="text-white font-mono">{(data.starPower).toFixed(1)}/10</span></div>
                                                            <div className="flex justify-between"><span className="text-blue-400">Mental:</span> <span className="text-white font-mono">{Math.round(data.giantKillerScore)}%</span></div>
                                                            <div className="mt-1 pt-1 border-t border-white/5 text-[9px] italic text-slate-500">
                                                                *Taille du point liée à la forme des Top Players
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Scatter name="Clubs" data={clusters} shape={(props) => {
                                        const { cx, cy, payload } = props;
                                        // Skip invalid coords
                                        if (isNaN(cx) || isNaN(cy)) return null;

                                        // Dynamic size for visibility
                                        const size = Math.max(30, Math.min(60, payload.size / 3));

                                        return (
                                            <foreignObject x={cx - (size / 2)} y={cy - (size / 2)} width={size} height={size}>
                                                <div
                                                    className="w-full h-full rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center justify-center border-2 overflow-hidden hover:scale-125 hover:z-50 transition-all cursor-pointer relative group"
                                                    style={{ borderColor: payload.color, backgroundColor: '#0f172a' }}
                                                >
                                                    <img
                                                        src={payload.img}
                                                        alt={payload.name}
                                                        className="object-contain"
                                                        style={{ width: '70%', height: '70%' }}
                                                    />
                                                </div>
                                            </foreignObject>
                                        );
                                    }} />
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>

                        {/* HORIZONTAL LEGEND - 7 GROUPS */}
                        <div className="flex flex-row flex-wrap justify-center gap-3 bg-black/20 p-4 rounded-xl border border-white/5">
                            <h4 className="w-full text-center text-sm font-bold text-white uppercase mb-3">
                                📊 Groupes de Performance (x7)
                            </h4>

                            {[
                                { name: '👑 Élites', color: '#CEF002' },
                                { name: '🇪🇺 Europe', color: '#a855f7' },
                                { name: '🔥 Attaque Feu', color: '#f472b6' },
                                { name: '🛡️ Blocs Murs', color: '#38bdf8' },
                                { name: '⚖️ Équilibrés', color: '#94a3b8' },
                                { name: '📉 Panne Off.', color: '#fb923c' },
                                { name: '🚨 Zone Critique', color: '#ef4444' },
                            ].map(cluster => (
                                <div key={cluster.name} className="flex flex-col items-center p-2 rounded-lg bg-white/5 border border-white/5 min-w-[80px] hover:bg-white/10 transition-all flex-grow md:flex-grow-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-2 h-2 rounded-full shadow-[0_0_5px_currentColor]" style={{ backgroundColor: cluster.color, color: cluster.color }}></div>
                                        <span className="font-bold text-[10px] text-white uppercase">{cluster.name}</span>
                                    </div>

                                    {/* Team Icons List for this Cluster */}
                                    {/* Simple Count only to save space? Or tiny icons? Tiny icons. */}
                                    <div className="flex flex-wrap justify-center gap-0.5 mt-1 max-w-[100px]">
                                        {clusters.filter(c => c.color === cluster.color).map(t => (
                                            <div
                                                key={t.name}
                                                className="rounded-full bg-white/10 p-[1px] border border-white/5 flex items-center justify-center opacity-80"
                                                title={t.name}
                                                style={{ width: '16px', height: '16px' }}
                                            >
                                                <img src={t.img} alt={t.name} className="w-full h-full object-contain" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* METHODOLOGY BLOCK */}
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5 mt-4">
                        <h4 className="text-sm font-bold text-white uppercase mb-2 flex items-center gap-2">
                            <span className="text-accent text-lg">ℹ️</span> Méthodologie du Clustering 2.0
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px] text-secondary leading-relaxed">
                            <div>
                                <strong className="text-white block mb-1">Source des Données</strong>
                                <p className="mb-2">
                                    Données combinées de <span className="text-white">Opta (Stats Réelles)</span> et du <span className="text-white">Modèle Prédictif Interne</span>.
                                    Mise à jour J{currentWeek}.
                                </p>
                                <strong className="text-white block mb-1">Algorithme de Score (0-100)</strong>
                                <ul className="list-disc pl-3 space-y-0.5">
                                    <li><span className="text-white">Score Offensif (Y)</span>: 40% Simulation + 40% Star Power + <span className="text-accent">20% Mental (Giant Killer)</span>.</li>
                                    <li><span className="text-white">Score Défensif (X)</span>: Basé sur les Buts Encaissés (GA) et la solidité défensive simulée.</li>
                                    <li><span className="text-white">Taille du Point</span>: Représente le niveau de dépendance aux Stars (Star Power).</li>
                                </ul>
                            </div>
                            <div>
                                <strong className="text-white block mb-1">Interprétation des 7 Groupes</strong>
                                <ul className="list-disc pl-3 space-y-0.5">
                                    <li><span className="text-[#CEF002]">👑 Élites</span>: Domination totale (Att+ / Def+).</li>
                                    <li><span className="text-[#a855f7]">🇪🇺 Europe</span>: Très solide avec potentiel offensif.</li>
                                    <li><span className="text-[#f472b6]">🔥 Attaque Feu</span>: Spectaculaire mais friable derrière.</li>
                                    <li><span className="text-[#38bdf8]">🛡️ Blocs Murs</span>: Verrous défensifs, peu de buts.</li>
                                    <li><span className="text-[#94a3b8]">⚖️ Ventre Mou</span>: Équipes moyennes sans point fort/faible marqué.</li>
                                    <li><span className="text-[#fb923c]">📉 Panne Off.</span>: Tient bon derrière mais inoffensif devant.</li>
                                    <li><span className="text-[#ef4444]">🚨 Zone Rouge</span>: Danger de relégation imminent.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. DETAILED METRICS (Existing) */}
                <div className="card p-6">
                    <div className="flex flex-col items-center mb-6">
                        <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-4">Statistiques Comparées</h3>

                        {/* Filter Switcher */}
                        <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
                            {['all', 'home', 'away'].map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setFilterContext(mode)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${filterContext === mode
                                        ? 'bg-accent text-slate-900 shadow-lg'
                                        : 'text-secondary hover:text-white'
                                        }`}
                                >
                                    {mode === 'all' ? 'Total' : mode === 'home' ? 'Domicile' : 'Extérieur'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        {comparisonData.map((item) => (
                            <StatRow key={item.key} label={item.label} keyName={item.key} />
                        ))}
                    </div>

                    <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/5 text-center">
                        <p className="text-[10px] text-secondary uppercase tracking-widest leading-relaxed">
                            * Les statistiques de cartons sont estimées sur la base de l'agressivité des équipes et des simulations de matchs historiques.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ClubComparator;
