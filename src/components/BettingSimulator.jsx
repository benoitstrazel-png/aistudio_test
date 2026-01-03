import React, { useMemo } from 'react';

const BettingSimulator = ({ matches }) => {
    if (!matches || matches.length === 0) return null;

    // Filter matches that have predictions
    const activeMatches = matches.filter(m => m.prediction);

    const getRowClass = (conf) => {
        if (conf >= 65) return 'hover:bg-green-500/10 transition-colors';
        if (conf >= 50) return 'hover:bg-orange-500/10 transition-colors';
        return 'hover:bg-red-500/10 transition-colors';
    };

    const getConfColor = (conf) => {
        if (conf >= 65) return 'text-green-400 bg-green-400/10 border border-green-400/20';
        if (conf >= 50) return 'text-orange-400 bg-orange-400/10 border border-orange-400/20';
        return 'text-red-400 bg-red-400/10 border border-red-400/20';
    };

    const combined1N2Prob = (activeMatches.reduce((acc, m) => acc * (m.prediction.confidence / 100), 1) * 100).toFixed(2);
    const combinedGoalsProb = (activeMatches.reduce((acc, m) => acc * ((m.prediction.goals_conf || 50) / 100), 1) * 100).toFixed(2);

    // Pick safest bets for the recommendation
    const safestBets = useMemo(() => {
        const result = [];

        // Pick best 1N2
        const sorted1N2 = [...activeMatches].sort((a, b) => b.prediction.confidence - a.prediction.confidence);
        if (sorted1N2[0]) result.push({ match: sorted1N2[0], type: '1N2', pick: sorted1N2[0].prediction.winner, conf: sorted1N2[0].prediction.confidence });

        // Pick best Goals
        const sortedGoals = [...activeMatches].sort((a, b) => (b.prediction.goals_conf || 0) - (a.prediction.goals_conf || 0));
        if (sortedGoals[0]) result.push({ match: sortedGoals[0], type: 'Buts', pick: sortedGoals[0].prediction.goals_pred, conf: sortedGoals[0].prediction.goals_conf || 50 });

        // Pick second best 1N2
        if (sorted1N2[1]) result.push({ match: sorted1N2[1], type: '1N2', pick: sorted1N2[1].prediction.winner, conf: sorted1N2[1].prediction.confidence });

        return result;
    }, [activeMatches]);

    // Helper to get a stable number from a string ID for simulation
    const getNumericId = (id) => {
        if (typeof id === 'number') return id;
        if (!id) return 0;
        return id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col items-center mb-10 text-center">
                <h2 className="text-3xl font-black text-white tracking-widest uppercase italic">
                    <span className="text-[#CEF002]">Betclic</span> Chasseur de côtes
                </h2>
                <div className="h-1 w-24 bg-[#CEF002] mt-4 rounded-full shadow-[0_0_15px_rgba(206,240,2,0.5)]"></div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* TABLE 1: RESULTATS (1N2) */}
                <div className="bg-[#0B1426] rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
                    <div className="bg-slate-900 text-white p-4 border-b-2 border-[#CEF002]">
                        <h4 className="font-black uppercase tracking-wider text-xs flex items-center gap-2">
                            🎯 Paris 1N2 (Vainqueur)
                        </h4>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-white">
                            <thead className="bg-white/5 text-[10px] uppercase font-black text-secondary tracking-widest">
                                <tr>
                                    <th className="p-4">Match</th>
                                    <th className="p-4">Pari</th>
                                    <th className="p-4 text-center">Cote</th>
                                    <th className="p-4 text-center">Fiab.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {activeMatches.map(match => {
                                    let selection = match.prediction.winner;
                                    let mId = getNumericId(match.id);
                                    let odd = match.odds?.[selection === match.homeTeam ? 'home' : selection === match.awayTeam ? 'away' : 'draw'] || (1.50 + (mId % 100) / 100).toFixed(2);

                                    return (
                                        <tr key={match.id} className={`transition-colors ${getRowClass(match.prediction.confidence)}`}>
                                            <td className="p-4 font-bold">
                                                <div className="flex flex-col">
                                                    <span>{match.homeTeam}</span>
                                                    <span className="text-[10px] text-gray-500">vs {match.awayTeam}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="font-black text-white/90 bg-white/10 px-2 py-1 rounded text-xs">
                                                    {selection}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="font-black text-[#CEF002]">
                                                    {odd}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${getConfColor(match.prediction.confidence)}`}>
                                                    {match.prediction.confidence}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="bg-white/5 p-5 border-t border-white/5 flex justify-between items-center">
                        <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Probabilité du combiné</span>
                        <div className="flex items-center gap-3">
                            <span className="text-xl font-black text-white">{combined1N2Prob}%</span>
                            <div className="h-2 w-20 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-[#CEF002]" style={{ width: `${combined1N2Prob}%` }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* TABLE 2: BUTS (OVER/UNDER) */}
                <div className="bg-[#0B1426] rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
                    <div className="bg-slate-900 text-white p-4 border-b-2 border-blue-500">
                        <h4 className="font-black uppercase tracking-wider text-xs flex items-center gap-2">
                            ⚽ Paris Buts (+/- 2.5)
                        </h4>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-white">
                            <thead className="bg-white/5 text-[10px] uppercase font-black text-secondary tracking-widest">
                                <tr>
                                    <th className="p-4">Match</th>
                                    <th className="p-4">Pari</th>
                                    <th className="p-4 text-center">Cote</th>
                                    <th className="p-4 text-center">Fiab.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {activeMatches.map(match => {
                                    const pred = match.prediction.goals_pred || "Non défini";
                                    const isOver = pred.includes('+');
                                    let mId = getNumericId(match.id);
                                    const odd = (1.50 + (mId % 60) / 100).toFixed(2);

                                    return (
                                        <tr key={match.id} className={`transition-colors ${getRowClass(match.prediction.goals_conf)}`}>
                                            <td className="p-4 font-bold">
                                                <div className="flex flex-col">
                                                    <span>{match.homeTeam}</span>
                                                    <span className="text-[10px] text-gray-500">vs {match.awayTeam}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`font-black px-2 py-1 rounded text-xs ${isOver ? 'bg-blue-600/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                                    {pred}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="font-black text-blue-400">
                                                    {odd}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${getConfColor(match.prediction.goals_conf)}`}>
                                                    {match.prediction.goals_conf || 50}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="bg-white/5 p-5 border-t border-white/5 flex justify-between items-center">
                        <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Probabilité du combiné</span>
                        <div className="flex items-center gap-3">
                            <span className="text-xl font-black text-white">{combinedGoalsProb}%</span>
                            <div className="h-2 w-20 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: `${combinedGoalsProb}%` }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* RECOMMENDATION SECTION */}
            <div className="card bg-gradient-to-br from-slate-900 to-[#0B1426] border border-[#CEF002]/20 shadow-[0_0_30px_rgba(206,240,2,0.05)] overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12">
                    <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="#CEF002" strokeWidth="1">
                        <circle cx="12" cy="12" r="10" />
                        <path d="m12 16 4-4-4-4" />
                        <path d="M8 12h8" />
                    </svg>
                </div>

                <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <span className="bg-[#CEF002]/10 text-[#CEF002] text-[10px] font-black uppercase px-2 py-1 rounded border border-[#CEF002]/20">Recommandation AI</span>
                                <h4 className="text-white font-black text-xl uppercase tracking-tighter italic">Le Combiné de la Rédaction</h4>
                            </div>
                            <p className="text-secondary text-sm font-medium">Les 3 pronostics les plus sûrs de la <span className="text-white">J{matches[0]?.week}</span> sélectionnés par nos algorithmes.</p>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            {safestBets.map((bet, i) => (
                                <div key={i} className="bg-black/40 border border-white/5 p-4 rounded-xl flex flex-col gap-1 min-w-[160px]">
                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{bet.type}</span>
                                    <span className="text-white font-black text-sm">{bet.pick}</span>
                                    <span className="text-secondary text-xs">{bet.match.homeTeam} vs {bet.match.awayTeam}</span>
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className="h-1 flex-grow bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-[#CEF002]" style={{ width: `${bet.conf}%` }} />
                                        </div>
                                        <span className="text-[10px] font-black text-[#CEF002]">{bet.conf}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-[#CEF002] p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-[0_10px_30px_rgba(206,240,2,0.2)] hover:scale-105 transition-transform cursor-pointer min-w-[180px]">
                            <span className="text-black font-black text-[10px] uppercase tracking-widest mb-1">Cote Totale</span>
                            <span className="text-black font-black text-3xl">{(safestBets.reduce((acc, b) => acc * (1.50 + (getNumericId(b.match.id) % 60) / 100), 1)).toFixed(2)}</span>
                            <div className="mt-2 bg-black text-[#CEF002] text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">Parier sur Betclic</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BettingSimulator;
