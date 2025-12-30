import React, { useMemo, useState, useEffect } from 'react';
import { TrendingUp, BarChart3, Shield, Zap, Target, Activity, Calendar, CheckSquare, Square } from 'lucide-react';

const TeamMatchStats = ({ selectedTeam, filteredMatches, matchStats }) => {
    const [aggMode, setAggMode] = useState('average'); // 'total' | 'average'
    const [period, setPeriod] = useState('fullTime'); // 'fullTime' | 'firstHalf' | 'secondHalf'
    const [selectedUrls, setSelectedUrls] = useState([]);
    const [selectionType, setSelectionType] = useState('all'); // 'all' | 'custom'

    // Reset selection when filteredMatches changes (e.g. changing club or venue)
    useEffect(() => {
        const availableUrls = filteredMatches.map(m => m.url).filter(url => matchStats[url]);
        setSelectedUrls(availableUrls);
        setSelectionType('all');
    }, [filteredMatches, matchStats]);

    const toggleMatch = (url) => {
        setSelectionType('custom');
        setSelectedUrls(prev =>
            prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
        );
    };

    const handleSelectAll = () => {
        const allUrls = filteredMatches.map(m => m.url).filter(url => matchStats[url]);
        setSelectedUrls(allUrls);
        setSelectionType('all');
    };

    const aggregated = useMemo(() => {
        const stats = {};
        let matchCount = 0;

        selectedUrls.forEach(url => {
            const matchData = matchStats[url];
            if (!matchData || !matchData[period]) return;

            matchCount++;
            const pStats = matchData[period];
            const meta = matchData.metadata || {};
            const isHome = meta.homeTeam === selectedTeam;
            const sideIdx = isHome ? 0 : 1;

            Object.entries(pStats).forEach(([label, values]) => {
                if (!stats[label]) stats[label] = 0;

                const rawVal = values[sideIdx];
                let num = 0;
                if (typeof rawVal === 'string') {
                    if (rawVal.includes('%')) {
                        num = parseFloat(rawVal.split('%')[0]);
                    } else if (rawVal.includes('/')) {
                        const matchNum = rawVal.match(/(\d+)/);
                        num = matchNum ? parseInt(matchNum[1]) : 0;
                    } else {
                        num = parseFloat(rawVal);
                    }
                }

                if (!isNaN(num)) {
                    stats[label] += num;
                }
            });
        });

        if (aggMode === 'average' && matchCount > 0) {
            Object.keys(stats).forEach(k => {
                const val = stats[k];
                // For categories ending in % (like Possession), we average the values
                stats[k] = (val / matchCount).toFixed(2);
            });
        }

        return { stats, matchCount };
    }, [selectedTeam, selectedUrls, matchStats, aggMode, period]);

    const categories = [
        { label: 'Attaque', icon: <TrendingUp className="text-accent" />, keys: ['Expected Goals (xG)', 'Tirs totaux', 'Tirs cadrés', 'Grosses occasions', 'Touches dans la surface adverse'] },
        { label: 'Distribution', icon: <Zap className="text-blue-400" />, keys: ['Possession de balle', 'Passes', 'Passes longues', 'Centres'] },
        { label: 'Défense', icon: <Shield className="text-red-400" />, keys: ['Arrêts du gardien', 'Fautes', 'Interceptions', 'Dégagements', 'Buts évités'] }
    ];

    const formatVal = (val, key) => {
        if (key.includes('Possession') || key.includes('Passes')) return `${parseFloat(val).toFixed(1)}%`;
        return val;
    };

    const matchesWithStats = filteredMatches.filter(m => matchStats[m.url]);

    return (
        <div className="flex flex-col gap-8">
            {/* MATCH SELECTION PANEL */}
            <div className="card bg-[#0B1426] p-6 border border-white/5">
                <div className="flex justify-between items-center mb-6">
                    <h4 className="text-sm font-black text-white uppercase italic flex items-center gap-2">
                        <Calendar size={16} className="text-accent" /> Sélection des Matchs
                    </h4>
                    <button
                        onClick={handleSelectAll}
                        className={`text-[10px] font-bold uppercase px-3 py-1 rounded transition-all ${selectionType === 'all' ? 'bg-accent text-[#0B1426]' : 'bg-white/5 text-secondary hover:text-white border border-white/10'}`}
                    >
                        Tous les matchs ({matchesWithStats.length})
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {matchesWithStats.map(m => {
                        const isSelected = selectedUrls.includes(m.url);
                        const meta = matchStats[m.url]?.metadata || {};
                        return (
                            <button
                                key={m.url}
                                onClick={() => toggleMatch(m.url)}
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left group ${isSelected ? 'bg-accent/10 border-accent/30' : 'bg-white/5 border-transparent hover:border-white/10'}`}
                            >
                                <div className={isSelected ? 'text-accent' : 'text-slate-600 group-hover:text-slate-400'}>
                                    {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[9px] font-bold text-secondary uppercase tracking-tighter truncate">
                                        {meta.round || m.round || "Match"}
                                    </span>
                                    <span className={`text-xs font-black truncate ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                                        {meta.homeTeam || m.homeTeam} - {meta.awayTeam || m.awayTeam}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* STATS DISPLAY PANEL */}
            {aggregated.matchCount === 0 ? (
                <div className="card bg-[#0B1426] p-12 text-center border border-white/5 min-h-[300px] flex flex-col items-center justify-center">
                    <Activity size={48} className="text-slate-700 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Aucun match sélectionné</h3>
                    <p className="text-slate-400">Veuillez sélectionner au moins un match pour voir l'analyse aggrégée.</p>
                </div>
            ) : (
                <div className="card bg-[#0B1426] p-8 border border-white/5 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h3 className="text-2xl font-black text-white uppercase italic flex items-center gap-3">
                                <Activity className="text-accent" /> Analyse Aggrégée
                            </h3>
                            <p className="text-secondary text-xs font-bold uppercase tracking-wider mt-1">
                                {aggregated.matchCount} match{aggregated.matchCount > 1 ? 's' : ''} analysé{aggregated.matchCount > 1 ? 's' : ''} • {aggMode === 'average' ? 'Moyennes' : 'Totaux'}
                            </p>
                        </div>

                        <div className="flex gap-4 flex-wrap">
                            <div className="flex bg-white/5 rounded-lg p-1">
                                {[{ id: 'fullTime', l: 'Match' }, { id: 'firstHalf', l: '1MT' }, { id: 'secondHalf', l: '2MT' }].map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => setPeriod(p.id)}
                                        className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${period === p.id ? 'bg-accent text-slate-900' : 'text-secondary hover:text-white'}`}
                                    >
                                        {p.l}
                                    </button>
                                ))}
                            </div>

                            <div className="flex bg-white/5 rounded-lg p-1">
                                <button
                                    onClick={() => setAggMode('total')}
                                    className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${aggMode === 'total' ? 'bg-blue-500 text-white' : 'text-secondary hover:text-white'}`}
                                >
                                    Total
                                </button>
                                <button
                                    onClick={() => setAggMode('average')}
                                    className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${aggMode === 'average' ? 'bg-blue-500 text-white' : 'text-secondary hover:text-white'}`}
                                >
                                    Moyenne
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {categories.map(cat => (
                            <div key={cat.label} className="space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                                    {cat.icon}
                                    <h4 className="font-bold text-white uppercase tracking-widest text-xs">{cat.label}</h4>
                                </div>
                                <div className="space-y-3">
                                    {cat.keys.map(key => {
                                        const val = aggregated.stats[key];
                                        if (val === undefined) return null;
                                        return (
                                            <div key={key} className="flex flex-col gap-1.5">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-400">{key}</span>
                                                    <span className="font-black text-white">{formatVal(val, key)}</span>
                                                </div>
                                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all duration-1000 ${cat.label === 'Attaque' ? 'bg-accent' : cat.label === 'Distribution' ? 'bg-blue-400' : 'bg-red-400'}`}
                                                        style={{ width: `${Math.min(100, (key.includes('Possession') || key.includes('Passes')) ? val : (val / (aggMode === 'total' ? aggregated.matchCount * 15 : 15)) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-6 border-t border-white/5 flex gap-8 flex-wrap">
                        <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl group hover:border-accent/30 border border-transparent transition-all">
                            <div className="p-2 rounded-lg bg-accent/10 text-accent">
                                <Target size={16} />
                            </div>
                            <div>
                                <p className="text-[10px] text-secondary font-bold uppercase tracking-wider">xG Cumulés</p>
                                <p className="text-lg font-black text-white italic">{(aggregated.stats['Expected Goals (xG)'] || 0)}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl group hover:border-blue-400/30 border border-transparent transition-all">
                            <div className="p-2 rounded-lg bg-blue-400/10 text-blue-400">
                                <BarChart3 size={16} />
                            </div>
                            <div>
                                <p className="text-[10px] text-secondary font-bold uppercase tracking-wider">Possession Moy.</p>
                                <p className="text-lg font-black text-white italic">{(aggregated.stats['Possession de balle'] || 0)}%</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamMatchStats;
