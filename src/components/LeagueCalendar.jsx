import React, { useState, useEffect } from 'react';
import InfoTooltip from './ui/InfoTooltip';

const LeagueCalendar = ({ schedule, currentWeek }) => {
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
        <div className="card">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                    <h2>Calendrier</h2>
                    <InfoTooltip text="Affiche les résultats passés ou les prédictions futures (avec indice de confiance) pour chaque journée." />
                </div>

                <select
                    className="bg-slate-700 text-white p-2 rounded text-sm"
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                >
                    {weeks.map(w => (
                        <option key={w} value={w}>Journée {w} {w === currentWeek ? '(Actuelle)' : ''}</option>
                    ))}
                </select>
            </div>

            <div className="grid gap-4">
                {matches.length === 0 && <p className="text-secondary text-center">Aucun match trouvé pour cette journée.</p>}

                {matches.map(match => (
                    <div key={match.id} className="glass-card p-4 flex flex-col gap-2">

                        {/* Match Header: Teams & Score */}
                        <div className="flex justify-between items-center mb-2">
                            <div className={`w-1/3 text-right font-bold truncate ${match.prediction?.winner === match.homeTeam ? 'text-accent' : 'text-white'}`}>
                                {match.homeTeam}
                            </div>

                            <div className="flex flex-col items-center mx-2 min-w-[80px]">
                                {match.status === 'FINISHED' ? (
                                    <span className="text-2xl font-bold font-mono text-white">{match.score.home} - {match.score.away}</span>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <span className="text-xl font-bold font-mono text-accent animate-pulse">
                                            {match.prediction?.score || '-'}
                                        </span>
                                        {/* Score Confidence for Prediction */}
                                        {match.prediction && (
                                            <span className={`text-[10px] px-1 rounded ${getConfColor(match.prediction.score_conf)} bg-slate-800`}>
                                                {match.prediction.score_conf || 15}% sûreté
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className={`w-1/3 text-left font-bold truncate ${match.prediction?.winner === match.awayTeam ? 'text-accent' : 'text-white'}`}>
                                {match.awayTeam}
                            </div>
                        </div>

                        {/* Prediction Details (Only if scheduled) */}
                        {match.status === 'SCHEDULED' && match.prediction && (
                            <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-700 pt-2 mt-1">
                                {/* Winner Prediction */}
                                <div className="flex flex-col items-center">
                                    <span className="text-secondary mb-1">Vainqueur</span>
                                    <div className="flex items-center gap-1">
                                        <span className="font-bold text-white">{match.prediction.winner}</span>
                                        <span className={`font-bold ${getConfColor(match.prediction.winner_conf)}`}>
                                            ({match.prediction.winner_conf}%)
                                        </span>
                                    </div>
                                </div>

                                {/* Goals Prediction */}
                                <div className="flex flex-col items-center border-l border-slate-700 pl-2">
                                    <span className="text-secondary mb-1">Buts</span>
                                    <div className="flex items-center gap-1">
                                        <span className="font-bold text-white">{match.prediction.goals_pred}</span>
                                        <span className={`font-bold ${getConfColor(match.prediction.goals_conf)}`}>
                                            ({match.prediction.goals_conf}%)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                ))}
            </div>
        </div>
    );
};

export default LeagueCalendar;
