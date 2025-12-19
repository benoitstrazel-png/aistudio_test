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

            <div className="grid gap-3">
                {matches.length === 0 && <p className="text-secondary text-center">Aucun match trouvé pour cette journée.</p>}

                {matches.map(match => (
                    <div key={match.id} className="glass-card p-3 flex justify-between items-center text-sm">

                        {/* Home Team */}
                        <div className={`w-1/3 text-right font-bold ${match.prediction?.winner === match.homeTeam ? 'text-accent' : ''}`}>
                            {match.homeTeam}
                        </div>

                        {/* Score / Prediction */}
                        <div className="flex flex-col items-center justify-center w-24">
                            {match.status === 'FINISHED' ? (
                                <span className="text-xl font-bold font-mono text-white">
                                    {match.score.home} - {match.score.away}
                                </span>
                            ) : (
                                <>
                                    <span className="text-lg font-bold font-mono text-accent animate-pulse">
                                        {match.prediction ? match.prediction.score : '-'}
                                    </span>
                                    {match.prediction && (
                                        <span className={`text-[10px] ${getConfColor(match.prediction.confidence)}`}>
                                            {match.prediction.confidence}% Conf.
                                        </span>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Away Team */}
                        <div className={`w-1/3 text-left font-bold ${match.prediction?.winner === match.awayTeam ? 'text-accent' : ''}`}>
                            {match.awayTeam}
                        </div>

                    </div>
                ))}
            </div>
        </div>
    );
};

export default LeagueCalendar;
