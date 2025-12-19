import React, { useState, useEffect } from 'react';
import { simulateSeason } from '../utils/simulation';
import InfoTooltip from './ui/InfoTooltip';
import TeamLogo from './ui/TeamLogo';

const Standings = ({ standings, schedule, currentWeek, highlightTeams = [] }) => {
    const [viewMode, setViewMode] = useState('live'); // 'live' or 'projected'
    const [displayStandings, setDisplayStandings] = useState([]);

    useEffect(() => {
        if (viewMode === 'live') {
            setDisplayStandings(standings || []);
        } else {
            // Calculate projection based on current stats + remaining schedule simulation
            if (schedule && schedule.length > 0) {
                // Simple projection: Current Points + (Remaining Matches * PPG) ? 
                // Or better: Use the simulation utils if available. 
                // For now, let's trigger a light simulation or just use the passed standings if simulation is expensive.
                // Since we don't have the full simulation engine in frontend state easily, 
                // we will assume 'standings' passed IS the latest live date.

                // If the USER wants "End of Season Prediction", we need to simulate the remaining games.
                // Let's use the helper 'simulateSeason' imported above.
                const projected = simulateSeason(standings, schedule);
                setDisplayStandings(projected);
            }
        }
    }, [viewMode, standings, schedule]);

    // Helper for Row Color (European Spots, Relegation)
    const getRowClass = (index) => {
        if (index < 3) return 'border-l-4 border-l-[#CEF002] bg-[#CEF002]/5'; // LDC (Green/Lime)
        if (index === 3) return 'border-l-4 border-l-orange-400 bg-orange-400/5'; // Barrage LDC
        if (index === 4) return 'border-l-4 border-l-yellow-400 bg-yellow-400/5'; // Europa
        if (index === 5) return 'border-l-4 border-l-green-600 bg-green-600/5'; // Conf
        if (index >= 15) return 'border-l-4 border-l-red-500 bg-red-500/5'; // Relegation/Barrage
        return 'border-l-4 border-l-transparent';
    };

    if (!standings || standings.length === 0) return <div className="card text-secondary p-4">Chargement du classement...</div>;

    return (
        <div className="card overflow-hidden border border-white/5 bg-[#0B1426]">

            {/* Header with Toggle */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4 border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg uppercase tracking-widest font-bold text-white mb-0">Classement</h2>
                    <InfoTooltip text="Live: Classement actuel. Projeté: Simulation de la fin de saison par l'IA." />
                </div>

                <div className="flex bg-slate-900 rounded-lg p-1 border border-white/10">
                    <button
                        onClick={() => setViewMode('live')}
                        className={`px-3 py-1 text-xs font-bold rounded uppercase transition-all ${viewMode === 'live' ? 'bg-accent text-slate-900 shadow-lg' : 'text-secondary hover:text-white'}`}
                    >
                        Live
                    </button>
                    <button
                        onClick={() => setViewMode('projected')}
                        className={`px-3 py-1 text-xs font-bold rounded uppercase transition-all ${viewMode === 'projected' ? 'bg-accent text-slate-900 shadow-lg' : 'text-secondary hover:text-white'}`}
                    >
                        Prédictif
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="text-[10px] uppercase bg-black/40 text-secondary font-bold sticky top-0 z-10 backdrop-blur-md">
                        <tr>
                            <th className="p-3">#</th>
                            <th className="p-3">Équipe</th>
                            <th className="p-3 text-center">Pts</th>
                            <th className="p-3 text-center hidden sm:table-cell">J</th>
                            <th className="p-3 text-center hidden md:table-cell">Diff</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayStandings.map((team, index) => {
                            const isHighlighted = highlightTeams.includes(team.name);
                            const rankColorClass = getRowClass(index);

                            return (
                                <tr key={team.name}
                                    className={`border-b border-white/5 transition-colors group
                                    ${isHighlighted ? 'bg-accent/20' : 'hover:bg-white/5'}
                                    ${rankColorClass}
                                    `}>
                                    <td className="p-3 font-mono font-bold w-12 text-center text-white/50">{index + 1}</td>

                                    <td className="p-3">
                                        <div className="flex items-center gap-3">
                                            <TeamLogo teamName={team.name} size="sm" className="hidden sm:flex" />
                                            <span className={`font-bold truncate max-w-[120px] sm:max-w-none ${isHighlighted ? 'text-accent' : 'text-white'}`}>
                                                {team.name}
                                            </span>
                                        </div>
                                    </td>

                                    <td className="p-3 text-center font-black text-white text-base">{team.points}</td>
                                    <td className="p-3 text-center opacity-70 hidden sm:table-cell font-mono text-xs">{team.played}</td>
                                    <td className={`p-3 text-center font-bold hidden md:table-cell text-xs ${team.goalDiff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {team.goalDiff > 0 ? `+${team.goalDiff}` : team.goalDiff}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 p-3 text-[10px] text-secondary border-t border-white/5 bg-black/20">
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#CEF002]"></span> LDC</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400"></span> Barrage LDC</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"></span> Europa</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Relégation</div>
            </div>
        </div>
    );
};

export default Standings;
