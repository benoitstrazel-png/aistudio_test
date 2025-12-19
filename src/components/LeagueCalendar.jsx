import React, { useState, useEffect } from 'react';
import InfoTooltip from './ui/InfoTooltip';
import TeamLogo from './ui/TeamLogo';

const LeagueCalendar = ({ schedule, currentWeek, highlightTeams = [] }) => {
    const [selectedWeek, setSelectedWeek] = useState(currentWeek + 1); // Default to next week
    const [matches, setMatches] = useState([]);

    // Available weeks (calculated from schedule max)
    const maxWeek = schedule.length > 0 ? Math.max(...schedule.map(m => m.week || 0)) : 34;
    const weeks = Array.from({ length: maxWeek }, (_, i) => i + 1);

    useEffect(() => {
        // Filter matches for selected week
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
                        <div key={match.id} className={`glass-card p-4 transition-all hover:bg-white/5 
                            ${isHighlighted ? 'border-accent bg-accent/5 shadow-[0_0_15px_rgba(206,240,2,0.1)]' : 'border-white/5'}`}>

                            {/* Match Row: [Home] [Score] [Away] */}
                            {/* Grid layout is more stable than flex for this alignment */}
                            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 md:gap-4 items-center">

                                {/* HOME */}
                                <div className="flex items-center justify-end gap-3 text-right">
                                    <span className={`font-bold text-sm md:text-base hidden sm:block ${isHighlighted && match.homeTeam === highlightTeams[0] ? 'text-accent' : 'text-white'}`}>
                                        {match.homeTeam}
                                    </span>
                                    <span className="sm:hidden font-bold text-xs uppercase tracking-tighter text-white">
                                        {match.homeTeam.substring(0, 3)}
                                    </span>
                                    <TeamLogo teamName={match.homeTeam} size="md" />
                                </div>

                                {/* CENTER SCORE */}
                                <div className="flex flex-col items-center justify-center min-w-[80px]">
                                    {match.status === 'FINISHED' ? (
                                        <span className="text-xl md:text-2xl font-black font-mono text-white tracking-widest bg-black/40 px-3 py-1 rounded-lg">
                                            {match.score.home}-{match.score.away}
                                        </span>
                                    ) : (
                                        <div className="flex flex-col items-center w-full">
                                            <div className="bg-black/40 px-3 py-1 rounded-lg mb-1 w-full text-center">
                                                <span className="text-lg md:text-xl font-black font-mono text-accent animate-pulse tracking-widest">
                                                    {match.prediction?.score || 'VS'}
                                                </span>
                                            </div>
                                            {match.prediction && (
                                                <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-bold bg-black/50 ${getConfColor(match.prediction.score_conf)}`}>
                                                    {match.prediction.score_conf || 15}%
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* AWAY */}
                                <div className="flex items-center justify-start gap-3 text-left">
                                    <TeamLogo teamName={match.awayTeam} size="md" />
                                    <span className={`font-bold text-sm md:text-base hidden sm:block ${isHighlighted && match.awayTeam === highlightTeams[1] ? 'text-accent' : 'text-white'}`}>
                                        {match.awayTeam}
                                    </span>
                                    <span className="sm:hidden font-bold text-xs uppercase tracking-tighter text-white">
                                        {match.awayTeam.substring(0, 3)}
                                    </span>
                                </div>

                            </div>

                            {/* Footer: Advanced Predictions */}
                            {match.status === 'SCHEDULED' && match.prediction && (
                                <div className="flex justify-center items-center gap-6 mt-3 pt-3 border-t border-white/5 text-xs text-secondary">
                                    <div className="flex items-center gap-1">
                                        <span className="opacity-50">Vainqueur:</span>
                                        <strong className="text-white">{match.prediction.winner}</strong>
                                        <span className={getConfColor(match.prediction.winner_conf)}>({match.prediction.winner_conf}%)</span>
                                    </div>
                                    <div className="w-px h-3 bg-white/10"></div>
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
