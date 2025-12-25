import React, { useState, useEffect } from 'react';
import { calculateStandingsAtWeek } from '../utils/simulation';
import TeamLogo from './ui/TeamLogo';

const Standings = ({ standings, schedule, currentWeek, selectedWeek, onWeekChange, highlightTeams = [] }) => {
    // Controlled component via parent
    const [displayStandings, setDisplayStandings] = useState([]);

    // Generate week options (Assuming 34 matchdays for L1)
    const weeks = Array.from({ length: 34 }, (_, i) => i + 1);

    useEffect(() => {
        if (standings && standings.length > 0 && schedule) {
            // Calculate standings for the specific week requested
            const calculated = calculateStandingsAtWeek(standings, schedule, selectedWeek, currentWeek);
            setDisplayStandings(calculated);
        }
    }, [selectedWeek, standings, schedule, currentWeek]);

    // Determining Mode Label
    let modeLabel = "Live";
    let modeColor = "bg-yellow-400 text-black";
    if (selectedWeek < currentWeek) {
        modeLabel = "Historique";
        modeColor = "bg-slate-500 text-white";
    } else if (selectedWeek > currentWeek) {
        modeLabel = "Prédiction";
        modeColor = "bg-accent text-black"; // Cyber lime
    }

    // Styles for Rank indicators (Direct Hex colors for reliability)
    const getRankColor = (rank) => {
        if (rank <= 3) return { bg: '#CEF002', text: '#000000' }; // LDC (Lime)
        if (rank === 4) return { bg: '#fb923c', text: '#000000' }; // Barrage/Europa (Orange)
        if (rank === 5) return { bg: '#facc15', text: '#000000' }; // Europa (Yellow)
        if (rank === 6) return { bg: '#16a34a', text: '#ffffff' }; // Conf (Green)
        if (rank >= 16) return { bg: '#ef4444', text: '#ffffff' }; // Relegation (Red)
        return { bg: 'transparent', text: '#94a3b8' };
    };

    const FormBulle = ({ result }) => {
        let bg = "#64748b"; // slate-500
        if (result === 'W') bg = "#22c55e"; // green-500
        if (result === 'D') bg = "#fb923c"; // orange-400
        if (result === 'L') bg = "#ef4444"; // red-500

        return (
            <div
                style={{
                    backgroundColor: bg,
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#000',
                    fontSize: '10px',
                    fontWeight: 'bold'
                }}
                title={result === 'W' ? 'Victoire' : result === 'D' ? 'Nul' : 'Défaite'}
            >
                {result}
            </div>
        );
    };

    if (!standings || standings.length === 0) return <div className="p-4 text-center">Chargement...</div>;

    return (
        <div className="card overflow-hidden border border-white/5 bg-[#0B1426] p-0">

            {/* Header Controls */}
            <div className="p-4 border-b border-white/5 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h2 className="section-title mb-0 flex items-center gap-2">
                        🏆 Classement
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${modeColor}`}>
                            {modeLabel}
                        </span>
                    </h2>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onWeekChange(Math.max(1, selectedWeek - 1))}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 text-white"
                            disabled={selectedWeek <= 1}
                        >
                            ←
                        </button>
                        <select
                            className="bg-slate-800 text-white text-sm p-1 rounded border border-white/10 font-bold"
                            value={selectedWeek}
                            onChange={(e) => onWeekChange(parseInt(e.target.value))}
                        >
                            {weeks.map(w => (
                                <option key={w} value={w}>J{w} {w === currentWeek ? '(Actuel)' : ''}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => onWeekChange(Math.min(34, selectedWeek + 1))}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 text-white"
                            disabled={selectedWeek >= 34}
                        >
                            →
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-black/20 text-secondary text-[10px] uppercase tracking-wider font-bold">
                        <tr>
                            <th className="p-3 text-center w-12">#</th>
                            <th className="p-3">Équipe</th>
                            <th className="p-3 text-center" title="Points">Pts</th>
                            <th className="p-3 text-center" title="Joués">J</th>
                            <th className="p-3 text-center hidden md:table-cell" title="Gagnés">G</th>
                            <th className="p-3 text-center hidden md:table-cell" title="Nuls">N</th>
                            <th className="p-3 text-center hidden md:table-cell" title="Perdus">P</th>
                            <th className="p-3 text-center hidden md:table-cell" title="Buts Pour">BP</th>
                            <th className="p-3 text-center hidden md:table-cell" title="Buts Contre">BC</th>
                            <th className="p-3 text-center font-bold" title="Différence">Diff</th>
                            <th className="p-3 text-center hidden sm:table-cell" title="Forme (5 derniers matchs)">Forme</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {displayStandings.map((team, index) => {
                            const isSelected = highlightTeams.includes(team.name);
                            const rankStyle = getRankColor(index + 1);

                            return (
                                <tr key={team.name} className={`hover:bg-white/5 transition-colors ${isSelected ? 'bg-accent/10' : ''}`}>
                                    <td className="p-2 text-center">
                                        <div
                                            className="w-6 h-6 mx-auto flex items-center justify-center rounded font-bold text-xs"
                                            style={{ backgroundColor: rankStyle.bg, color: rankStyle.text }}
                                        >
                                            {index + 1}
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-3">
                                            <TeamLogo teamName={team.name} size="sm" />
                                            <span className={`font-bold ${isSelected ? 'text-accent' : 'text-white'}`}>
                                                {team.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-3 text-center font-black text-accent text-base">{team.points}</td>
                                    <td className="p-3 text-center text-secondary">{team.played}</td>

                                    <td className="p-3 text-center hidden md:table-cell text-white/50">{team.won}</td>
                                    <td className="p-3 text-center hidden md:table-cell text-white/50">{team.drawn}</td>
                                    <td className="p-3 text-center hidden md:table-cell text-white/50">{team.lost}</td>

                                    <td className="p-3 text-center hidden md:table-cell text-green-400/70">{team.gf}</td>
                                    <td className="p-3 text-center hidden md:table-cell text-red-400/70">{team.ga}</td>

                                    <td className="p-3 text-center font-bold font-mono">{team.gd > 0 ? `+${team.gd}` : team.gd}</td>

                                    <td className="p-3 text-center hidden sm:table-cell">
                                        <div className="flex items-center justify-center gap-1.5 min-w-[80px]">
                                            {team.recentForm && team.recentForm.length > 0 ? (
                                                team.recentForm.map((f, i) => <FormBulle key={i} result={f} />)
                                            ) : (
                                                <span className="text-[10px] text-white/20">-</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Legend Footer */}
            <div className="p-3 border-t border-white/5 bg-black/20 flex flex-wrap gap-4 text-[10px] text-secondary justify-center">
                <div className="flex items-center gap-1"><span className="w-2 h-2 bg-[#CEF002] rounded-full"></span> LDC</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-400 rounded-full"></span> Europa</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 bg-green-600 rounded-full"></span> Conf</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full"></span> Relégation</div>
            </div>
        </div>
    );
};

export default Standings;
