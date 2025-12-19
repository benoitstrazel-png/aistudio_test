import React, { useState, useEffect } from 'react';
import InfoTooltip from './ui/InfoTooltip';
import TeamLogo from './ui/TeamLogo';

const LeagueCalendar = ({ schedule, currentWeek, highlightTeams = [] }) => {
    const [selectedWeek, setSelectedWeek] = useState(currentWeek + 1);
    const [matches, setMatches] = useState([]);

    const maxWeek = schedule.length > 0 ? Math.max(...schedule.map(m => m.week || 0)) : 34;
    const weeks = Array.from({ length: maxWeek }, (_, i) => i + 1);

    useEffect(() => {
        setMatches(schedule.filter(m => m.week === selectedWeek));
    }, [selectedWeek, schedule]);

    const getConfColor = (conf) => {
        if (conf >= 70) return 'text-green-400';
        if (conf >= 55) return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <div className="card bg-[#0B1426] border border-white/5 shadow-xl">
            <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-white m-0 text-lg uppercase tracking-widest font-bold flex items-center gap-2">
                        📅 Affiches <span className="text-accent text-sm bg-accent/10 px-2 py-0.5 rounded">J{selectedWeek}</span>
                    </h2>
                </div>

                <select
                    className="bg-slate-800 text-white p-2 rounded text-sm w-40 border border-white/10"
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                >
                    {weeks.map(w => (
                        <option key={w} value={w}>Journée {w}</option>
                    ))}
                </select>
            </div>

            <div className="grid gap-3">
                {matches.length === 0 && <p className="text-secondary text-center py-8">Aucun match trouvé pour cette journée.</p>}

                {matches.map(match => {
                    const isHighlighted = highlightTeams.includes(match.homeTeam) || highlightTeams.includes(match.awayTeam);

                    return (
                        <div key={match.id} className={`glass-card p-2 md:p-3 transition-all hover:bg-white/5 
                            ${isHighlighted ? 'border-accent bg-accent/5 shadow-[0_0_15px_rgba(206,240,2,0.1)]' : 'border-white/5'}`}>

                            {/* 5-COLUMN GRID LAYOUT: Strict Alignment */}
                            <div className="grid grid-cols-[40px_1fr_60px_1fr_40px] md:grid-cols-[50px_1fr_100px_1fr_50px] gap-2 items-center">

                                {/* 1. Logo Home */}
                                <div className="flex justify-center">
                                    <TeamLogo teamName={match.homeTeam} size="md" />
                                </div>

                                {/* 2. Name Home (Right Aligned) */}
                                <div className="text-right pr-2 overflow-hidden flex flex-col justify-center h-full">
                                    <span className={`font-bold text-xs md:text-sm truncate ${isHighlighted && match.homeTeam === highlightTeams[0] ? 'text-accent' : 'text-white'}`}>
                                        {match.homeTeam}
                                    </span>
                                </div>

                                {/* 3. SCORE (Center, Fixed Width) */}
                                <div className="flex flex-col items-center justify-center">
                                    {match.status === 'FINISHED' ? (
                                        <span className="text-lg md:text-xl font-black font-mono text-white tracking-widest bg-black/40 px-2 py-1 rounded w-full text-center">
                                            {match.score.home}-{match.score.away}
                                        </span>
                                    ) : (
                                        <div className="flex flex-col items-center w-full">
                                            <div className="bg-black/40 px-2 py-1 rounded mb-1 w-full text-center">
                                                <span className="text-base md:text-lg font-black font-mono text-accent animate-pulse tracking-widest block">
                                                    {match.prediction?.score || 'VS'}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 4. Name Away (Left Aligned) */}
                                <div className="text-left pl-2 overflow-hidden flex flex-col justify-center h-full">
                                    <span className={`font-bold text-xs md:text-sm truncate ${isHighlighted && match.awayTeam === highlightTeams[1] ? 'text-accent' : 'text-white'}`}>
                                        {match.awayTeam}
                                    </span>
                                </div>

                                {/* 5. Logo Away */}
                                <div className="flex justify-center">
                                    <TeamLogo teamName={match.awayTeam} size="md" />
                                </div>

                            </div>

                            {/* Confidence Footer (Optional, hidden on very small screens if needed) */}
                            {match.status === 'SCHEDULED' && match.prediction && (
                                <div className="flex justify-center items-center gap-4 mt-2 pt-2 border-t border-white/5 text-[10px] text-secondary">
                                    <div className="flex items-center gap-1">
                                        <span className="opacity-50">V:</span>
                                        <strong className="text-white truncate max-w-[60px]">{match.prediction.winner}</strong>
                                        <span className={getConfColor(match.prediction.winner_conf)}>({match.prediction.winner_conf}%)</span>
                                    </div>
                                    <div className="hidden md:block w-px h-2 bg-white/10"></div>
                                    <div className="flex items-center gap-1">
                                        <span className="opacity-50">Buts:</span>
                                        <strong className="text-white">{match.prediction.goals_pred}</strong>
                                        <span className={getConfColor(match.prediction.goals_conf)}>({match.prediction.goals_conf}%)</span>
                                    </div>
                                </div>
                            )}

                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default LeagueCalendar;
