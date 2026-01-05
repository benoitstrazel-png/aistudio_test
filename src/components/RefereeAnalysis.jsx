import React, { useMemo, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { analyzeReferees } from '../utils/refereeAnalysis';
import matchesHistory from '../data/matches_history_detailed.json';

// Reuse HUDCard style from other components
const HUDCard = ({ title, children, borderColor = "cyan", className = "", disableClip = false }) => (
    <div className={`relative bg-slate-900/40 backdrop-blur-xl border-l-4 border-${borderColor}-500 p-6 rounded-r-2xl shadow-[0_0_50px_rgba(0,0,0,0.3)] group hover:bg-slate-900/60 transition-all duration-500 overflow-hidden ${className}`}>
        <div className={`absolute top-0 right-0 w-32 h-32 bg-${borderColor}-500/5 blur-[60px] rounded-full -mr-16 -mt-16 group-hover:bg-${borderColor}-500/10 transition-all duration-700`} />
        {title && (
            <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className={`w-2 h-2 rounded-full bg-${borderColor}-400 animate-pulse`} />
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] font-mono">{title}</h3>
            </div>
        )}
        <div className="relative z-10">{children}</div>
    </div>
);

const RefereeAnalysis = () => {
    const [sortConfig, setSortConfig] = useState({ key: 'matches', direction: 'desc' });
    const [selectedReferee, setSelectedReferee] = useState(null);

    const refereeData = useMemo(() => {
        const data = analyzeReferees(matchesHistory);
        return data.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [sortConfig]);

    const activeRef = selectedReferee || refereeData[0];

    const handleSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const pieData = activeRef ? [
        { name: 'Jaunes', value: activeRef.yellowCards, color: '#fbbf24' },
        { name: 'Rouges', value: activeRef.redCards, color: '#ef4444' }
    ] : [];

    const statsCards = [
        { label: 'Matchs', value: activeRef?.matches, color: 'cyan' },
        { label: 'Jaunes / Match', value: activeRef?.yellowsPerMatch, color: 'yellow' },
        { label: 'Rouges / Match', value: activeRef?.redsPerMatch, color: 'red' },
        { label: 'Pénalties', value: activeRef?.penalties, color: 'magenta' }
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* HEADER AREA */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <HUDCard title="CLASSEMENT DES ARBITRES">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-separate border-spacing-y-2">
                                <thead>
                                    <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        <th className="pb-4 pl-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('name')}>Arbitre</th>
                                        <th className="pb-4 cursor-pointer hover:text-white transition-colors text-center" onClick={() => handleSort('matches')}>Matchs</th>
                                        <th className="pb-4 cursor-pointer hover:text-white transition-colors text-center" onClick={() => handleSort('yellowCards')}>Jau.</th>
                                        <th className="pb-4 cursor-pointer hover:text-white transition-colors text-center" onClick={() => handleSort('redCards')}>Rou.</th>
                                        <th className="pb-4 cursor-pointer hover:text-white transition-colors text-center" onClick={() => handleSort('cardsPerMatch')}>Tot/Match</th>
                                        <th className="pb-4 cursor-pointer hover:text-white transition-colors text-center" onClick={() => handleSort('penalties')}>Pén.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {refereeData.map((ref) => (
                                        <tr
                                            key={ref.name}
                                            onClick={() => setSelectedReferee(ref)}
                                            className={`group cursor-pointer transition-all duration-300 ${activeRef?.name === ref.name ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                        >
                                            <td className="py-4 pl-4 rounded-l-xl">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-1 h-8 rounded-full ${activeRef?.name === ref.name ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-slate-700'}`} />
                                                    <span className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors uppercase italic">{ref.name}</span>
                                                </div>
                                            </td>
                                            <td className="text-center font-mono text-sm text-slate-400">{ref.matches}</td>
                                            <td className="text-center font-mono text-sm text-yellow-400 font-bold">{ref.yellowCards}</td>
                                            <td className="text-center font-mono text-sm text-red-500 font-bold">{ref.redCards}</td>
                                            <td className="text-center font-mono text-sm text-cyan-400 font-black">{ref.cardsPerMatch}</td>
                                            <td className="text-center font-mono text-sm text-magenta-400 pr-4 rounded-r-xl">{ref.penalties}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </HUDCard>
                </div>

                <div className="space-y-6">
                    <HUDCard title="FOCUS INDIVIDUEL" borderColor="magenta">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-1">{activeRef?.name}</h2>
                            <p className="text-[10px] text-magenta-400 font-black tracking-[0.3em] uppercase">Stats cumulées saison 25/26</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            {statsCards.map(card => (
                                <div key={card.label} className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                                    <div className="text-2xl font-black text-white mb-1">{card.value}</div>
                                    <div className={`text-[8px] font-black uppercase tracking-widest text-${card.color}-400`}>{card.label}</div>
                                </div>
                            ))}
                        </div>

                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                                        itemStyle={{ fontWeight: 'bold' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </HUDCard>
                </div>
            </div>

            {/* CHARTS AREA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <HUDCard title="RÉPARTITION CHRONOLOGIQUE DES CARTONS" borderColor="cyan">
                    <div className="h-64 w-full mt-4">
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={activeRef?.timeline}>
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                                />
                                <YAxis hide />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }}
                                />
                                <Bar dataKey="yellows" stackId="a" fill="#fbbf24" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="reds" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 text-[9px] text-slate-500 font-bold uppercase tracking-widest text-center">
                        Minute du match (intervalles de 15 min)
                    </div>
                </HUDCard>

                <HUDCard title="AGRESSIVITÉ COMPARÉE (CARTONS / MATCH)" borderColor="yellow">
                    <div className="h-64 w-full mt-4">
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={refereeData.slice(0, 8)} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#fff', fontSize: 10, fontWeight: 'black', fontStyle: 'italic' }}
                                    width={100}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }}
                                />
                                <Bar dataKey="cardsPerMatch" fill="#fbbf24" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 text-[9px] text-slate-500 font-bold uppercase tracking-widest text-center">
                        TOP 8 Arbitres les plus sévères
                    </div>
                </HUDCard>
            </div>
        </div>
    );
};

export default RefereeAnalysis;
