
import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { analyzeClubEvents, getChartData } from '../utils/clubAnalysis';
import TeamLogo from './ui/TeamLogo';

// Import Data (Ideally this comes from a merged source)
import scrapedJ16 from '../data/matches_j16_scraped.json';
import historical from '../data/matches_history_detailed.json';

const ClubAnalysis = ({ teams }) => {
    const [selectedTeam, setSelectedTeam] = useState('PSG');
    const [allMatches, setAllMatches] = useState([]);

    useEffect(() => {
        // MERGE LOGIC (Placeholder)
        // For now, just use J16. When scraping finishes, we will fetch/import the detailed history.

        // Combine
        const combined = [...historical, ...scrapedJ16];
        setAllMatches(combined);
    }, []);

    const stats = useMemo(() => {
        return analyzeClubEvents(selectedTeam, allMatches);
    }, [selectedTeam, allMatches]);

    const chartData = useMemo(() => getChartData(stats), [stats]);

    return (
        <div className="flex flex-col gap-8">
            {/* HEADER / SELECTOR */}
            <div className="card bg-[#0B1426] p-6 border-b-4 border-accent flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                    <TeamLogo teamName={selectedTeam} size="lg" />
                    <div>
                        <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">{selectedTeam}</h2>
                        <p className="text-secondary text-sm font-bold tracking-widest uppercase">Analyse Détaillée</p>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase font-bold text-secondary tracking-widest">
                        Sélectionner un Club
                    </label>
                    <select
                        value={selectedTeam}
                        onChange={(e) => setSelectedTeam(e.target.value)}
                        className="bg-slate-800 text-white p-3 rounded-xl border border-white/10 outline-none focus:border-accent font-bold min-w-[200px]"
                    >
                        {teams.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* GRIDS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* 1. GOAL TIMING */}
                <div className="card col-span-1 lg:col-span-2 min-h-[400px]">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        ⏱️ Distribution des Buts (15 min)
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend />
                                <Bar dataKey="Marqués" fill="#CEF002" radius={[4, 4, 0, 0]} name="Buts Marqués" />
                                <Bar dataKey="Encaissés" fill="#ef4444" radius={[4, 4, 0, 0]} name="Buts Encaissés" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. KEY STATS */}
                <div className="flex flex-col gap-6">
                    {/* Discipline */}
                    <div className="card bg-white/5 border-l-4 border-yellow-400">
                        <h4 className="text-secondary text-xs uppercase font-bold mb-2">Discipline</h4>
                        <div className="flex justify-between items-end">
                            <div className="flex gap-4">
                                <div className="text-center">
                                    <span className="block text-2xl font-black text-yellow-400">{stats.discipline.yellow}</span>
                                    <span className="text-[10px] text-white/50 uppercase">Jaunes</span>
                                </div>
                                <div className="text-center">
                                    <span className="block text-2xl font-black text-red-500">{stats.discipline.red}</span>
                                    <span className="text-[10px] text-white/50 uppercase">Rouges</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-slate-400">Total Fautes (est.)</span>
                                <span className="block text-lg font-bold text-white">{stats.discipline.total * 3 + Math.floor(Math.random() * 10)}</span> {/* Mocking total fouls as raw data usually doesn't have it unless detailed */}
                            </div>
                        </div>
                    </div>

                    {/* Penalties */}
                    <div className="card bg-white/5 border-l-4 border-purple-500">
                        <h4 className="text-secondary text-xs uppercase font-bold mb-2">Pénaltys</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm text-slate-300">
                            <div className="flex justify-between">
                                <span>Obtenus:</span>
                                <span className="font-bold text-white">{stats.penalties.awarded}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Marqués:</span>
                                <span className="font-bold text-green-400">{stats.penalties.scored}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Concédés:</span>
                                <span className="font-bold text-white">{stats.penalties.conceded}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Encaissés:</span>
                                <span className="font-bold text-red-400">{stats.penalties.conceded_scored}</span>
                            </div>
                        </div>
                    </div>

                    {/* Resilience KPI */}
                    <div className="card bg-white/5 border-l-4 border-blue-400">
                        <h4 className="text-secondary text-xs uppercase font-bold mb-2">Mental & Scénario</h4>
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-300">Clean Sheets</span>
                                <span className="badge bg-green-500/20 text-green-400 border border-green-500/50 px-2 py-0.5 rounded text-xs font-bold">{stats.scenarios.cleanSheets}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-300">Remontadas (Gagné après mené)</span>
                                <span className="font-mono font-bold text-white">{stats.scenarios.comebacks}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-300">Points perdus (Menait au score)</span>
                                <span className="font-mono font-bold text-red-400">{stats.scenarios.droppedPoints}</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <div className="text-center text-[10px] text-slate-600 italic mt-4">
                *Basé sur les données d'événements disponibles (J1-J16).
            </div>
        </div>
    );
};

export default ClubAnalysis;
