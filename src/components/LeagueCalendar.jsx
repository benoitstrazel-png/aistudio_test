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

    // Helper for confidence color
    const getConfClass = (conf) => {
        if (!conf) return 'text-slate-400';
        if (conf >= 60) return 'text-[#CEF002]'; // Lime
        if (conf >= 45) return 'text-orange-400'; // Orange
        return 'text-red-400'; // Red
    };

    return (
        <div className="card bg-[#0B1426] border border-white/5 shadow-xl">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-white m-0 text-lg uppercase tracking-widest font-bold flex items-center gap-2">
                        📅 Affiches <span className="text-accent text-sm bg-accent/10 px-2 py-0.5 rounded">J{selectedWeek}</span>
                    </h2>
                </div>

                <select
                    className="bg-slate-800 text-white p-2 rounded text-sm w-32 border border-white/10"
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                >
                    {weeks.map(w => (
                        <option key={w} value={w}>J{w}</option>
                    ))}
                </select>
            </div>

            {/* Matches Grid */}
            <div className="flex flex-col gap-4">
                {matches.length === 0 && <p className="text-secondary text-center py-8">Aucun match trouvé pour cette journée.</p>}

                {matches.map(match => {
                    const isHighlighted = highlightTeams.includes(match.homeTeam) || highlightTeams.includes(match.awayTeam);

                    // Logic for display text
                    let winnerDisplay = match.prediction?.winner;
                    const winnerConf = match.prediction?.winner_conf || 0;

                    if (winnerDisplay === 'Draw' || winnerDisplay === 'Nul') {
                        winnerDisplay = "Nul";
                    } else if (winnerDisplay === match.homeTeam) {
                        winnerDisplay = match.homeTeam;
                    } else if (winnerDisplay === match.awayTeam) {
                        winnerDisplay = match.awayTeam;
                    }

                    // --- ADVANCED CONSISTENCY FIX: Score matching Winner AND Goals Pred ---
                    let displayScore = match.prediction?.score || '-';

                    if (match.status === 'SCHEDULED' && match.prediction?.score) {
                        let parts = match.prediction.score.split('-').map(x => parseInt(x));
                        if (parts.length === 2) {
                            let [h, a] = parts;
                            const totalGoals = h + a;
                            const isOver2_5 = match.prediction.goals_pred?.includes('+2.5');
                            const isUnder2_5 = match.prediction.goals_pred?.includes('-2.5');

                            // 1. Force Winner Consistency first
                            if (winnerDisplay === match.homeTeam && h <= a) h = a + 1;
                            else if (winnerDisplay === match.awayTeam && a <= h) a = h + 1;
                            else if (winnerDisplay === "Nul" && h !== a) { const m = Math.max(h, a); h = m; a = m; }

                            // 2. Force Goals Consistency (experimental)
                            if (isUnder2_5 && (h + a) > 2) {
                                // Must reduce score but keep winner
                                if (winnerDisplay === match.homeTeam) { h = 1; a = 0; } // 1-0
                                else if (winnerDisplay === match.awayTeam) { h = 0; a = 1; } // 0-1
                                else { h = 1; a = 1; } // 1-1
                            }
                            else if (isOver2_5 && (h + a) < 3) {
                                // Must increase score but keep winner
                                // Usually means 1-0 or 1-1 needs boost
                                if (winnerDisplay === match.homeTeam) { h = 2; a = 1; } // 2-1
                                else if (winnerDisplay === match.awayTeam) { h = 1; a = 2; } // 1-2
                                else { h = 2; a = 2; } // 2-2
                            }

                            displayScore = `${h}-${a}`;
                        }
                    }

                    if (match.status === 'FINISHED') {
                        displayScore = `${match.score.home}-${match.score.away}`;
                    }
                    // -----------------------------------------------------------------------

                    return (
                        <div key={match.id} className={`glass-card p-4 transition-all hover:bg-white/5 
                            ${isHighlighted ? 'border-accent bg-accent/5 shadow-[0_0_15px_rgba(206,240,2,0.1)]' : 'border-white/5'}`}>

                            {/* 3-COLUMN LAYOUT: Left (Home), Center (Info), Right (Away) */}
                            <div className="grid grid-cols-3 gap-2 items-center min-h-[100px]">

                                {/* HOME (Left): Logo Top, Name Bottom */}
                                <div className="flex flex-col items-center justify-center gap-2">
                                    <TeamLogo teamName={match.homeTeam} size="md" />
                                    <span className={`font-bold text-sm text-center leading-tight ${isHighlighted && match.homeTeam === highlightTeams[0] ? 'text-accent' : 'text-white'}`}>
                                        {match.homeTeam}
                                    </span>
                                </div>

                                {/* CENTER: Stacked Info */}
                                <div className="flex flex-col items-center justify-center text-center">
                                    {/* Score */}
                                    {match.status === 'FINISHED' ? (
                                        <span className="text-2xl font-black font-mono text-accent tracking-widest mb-1">
                                            {displayScore}
                                        </span>
                                    ) : (
                                        <div className="mb-1">
                                            <span className="text-xl font-black font-mono text-accent animate-pulse tracking-widest">
                                                {displayScore}
                                            </span>
                                        </div>
                                    )}

                                    {/* PREDICTIONS STACKED */}
                                    {match.status === 'SCHEDULED' && match.prediction && (
                                        <div className="flex flex-col items-center gap-0.5 text-xs font-bold text-slate-300">

                                            {/* Line 1: Winner */}
                                            <div className="whitespace-nowrap">
                                                <span className="opacity-50 mr-1">V:</span>
                                                <span className="text-white mr-1">{winnerDisplay}</span>
                                                <span className={getConfClass(winnerConf)}>({winnerConf}%)</span>
                                            </div>

                                            {/* Line 2: Goals */}
                                            <div className="whitespace-nowrap">
                                                <span className="opacity-50 mr-1">Buts:</span>
                                                <span className="text-white mr-1">{match.prediction.goals_pred}</span>
                                                <span className={getConfClass(match.prediction.goals_conf)}>({match.prediction.goals_conf}%)</span>
                                            </div>

                                        </div>
                                    )}
                                </div>

                                {/* AWAY (Right): Logo Top, Name Bottom (Symmetrical) */}
                                <div className="flex flex-col items-center justify-center gap-2">
                                    <TeamLogo teamName={match.awayTeam} size="md" />
                                    <span className={`font-bold text-sm text-center leading-tight ${isHighlighted && match.awayTeam === highlightTeams[1] ? 'text-accent' : 'text-white'}`}>
                                        {match.awayTeam}
                                    </span>
                                </div>

                            </div>

                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default LeagueCalendar;
