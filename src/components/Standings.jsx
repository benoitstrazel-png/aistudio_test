
import React, { useState, useMemo } from 'react';
import InfoTooltip from './ui/InfoTooltip';

const Standings = ({ standings: initialStandings, schedule = [], currentWeek }) => {
    const [view, setView] = useState('live'); // 'live' or 'projected'
    // When in Live view: slider max is currentWeek.
    // When in Projected view: slider starts at currentWeek and goes to 34.
    const [selectedWeek, setSelectedWeek] = useState(currentWeek);

    // Compute Standings
    const computedStandings = useMemo(() => {
        // Determine the target week based on view mode logic
        // Actually, simplifying: The slider controls the "Virtual Week". 
        // If Virtual Week > Current Week -> It's a projection.

        // We need a list of all teams to init stats
        const stats = {};
        const teams = Array.from(new Set(schedule.map(m => m.homeTeam).concat(schedule.map(m => m.awayTeam))));

        teams.forEach(t => {
            stats[t] = { team: t, played: 0, points: 0, gd: 0, gf: 0, ga: 0 };
        });

        // Process Schedule up to Selected Week
        schedule.forEach(m => {
            if (m.week > selectedWeek) return;

            const h = m.homeTeam;
            const a = m.awayTeam;

            let hg = 0, ag = 0;
            let isPlayed = false;

            // Logic: If match is Finished, use real score.
            // If match is Scheduled (Future) AND we are in Projection mode for that week, use Predictive score.

            if (m.status === 'FINISHED') {
                hg = m.score.home;
                ag = m.score.away;
                isPlayed = true;
            } else if (m.status === 'SCHEDULED' && view === 'projected') {
                // Use prediction
                if (m.prediction) {
                    const parts = m.prediction.score.split('-');
                    hg = parseInt(parts[0]);
                    ag = parseInt(parts[1]);
                    isPlayed = true;
                }
            }

            if (isPlayed) {
                if (!stats[h]) stats[h] = { team: h, played: 0, points: 0, gd: 0, gf: 0, ga: 0 };
                if (!stats[a]) stats[a] = { team: a, played: 0, points: 0, gd: 0, gf: 0, ga: 0 };

                stats[h].played++;
                stats[a].played++;
                stats[h].gf += hg; stats[h].ga += ag;
                stats[a].gf += ag; stats[a].ga += hg;

                if (hg > ag) {
                    stats[h].points += 3;
                } else if (ag > hg) {
                    stats[a].points += 3;
                } else {
                    stats[h].points += 1;
                    stats[a].points += 1;
                }
            }
        });

        const list = Object.values(stats);
        list.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            const gdA = a.gf - a.ga;
            const gdB = b.gf - b.ga;
            return gdB - gdA;
        });

        return list;
    }, [schedule, selectedWeek, view]);

    // Determine row style based on rank (Ligue 1 2025 Rules approx)
    // 1-3: UCL Direct (Green)
    // 4: UCL Playoff (Light Green)
    // 5: UEL (Orange)
    // 6: UECL (Blue) - often 6th unless Cup winner takes it 
    // 16: Relegation Playoff (Orange/Red)
    // 17-18: Relegation (Red)

    const getRowBorder = (index) => {
        if (index < 3) return '4px solid #4ade80'; // Top 3 Green
        if (index === 3) return '4px solid #86efac'; // 4th Light Green
        if (index === 4) return '4px solid #fb923c'; // 5th Orange
        if (index === 5) return '4px solid #60a5fa'; // 6th Blue
        if (index === 15) return '4px solid #fb923c'; // 16th Barrage
        if (index > 15) return '4px solid #f87171'; // Relegation
        return 'none';
    };

    return (
        <div className="card">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                    <h2>Classement {view === 'projected' ? 'Prédictif' : 'Actuel'}</h2>
                    <InfoTooltip text="Classement en temps réel ou projeté. Les barres colorées indiquent les places européennes (Vert=LDC, Orange=Europa, Bleu=Conf) et la relégation (Rouge)." />
                </div>

                <div className="flex gap-2 text-xs bg-slate-800 p-1 rounded">
                    <button
                        className={`px - 3 py - 1 rounded transition - colors ${view === 'live' ? 'bg-slate-600 text-white' : 'text-secondary hover:text-white'} `}
                        onClick={() => { setView('live'); setSelectedWeek(currentWeek); }}
                    >
                        Live
                    </button>
                    <button
                        className={`px - 3 py - 1 rounded transition - colors ${view === 'projected' ? 'bg-accent text-primary font-bold' : 'text-secondary hover:text-white'} `}
                        onClick={() => { setView('projected'); setSelectedWeek(34); }}
                    >
                        Projection
                    </button>
                </div>
            </div>

            {/* Slider is only active in Projection to explore future, OR in Live to see past history. 
          Let's make it unified: 
          if View == Live: Slider max = CurrentWeek. (Time Travel)
          if View == Projected: Slider max = 34. (Future Travel)
      */}
            <div className="mb-4 px-2">
                <label className="text-xs text-secondary mb-1 flex justify-between">
                    <span>Journée: {selectedWeek}</span>
                    <span className="text-[10px] uppercase tracking-wider">{selectedWeek > currentWeek ? 'Simulation Future' : 'Historique'}</span>
                </label>
                <input
                    type="range"
                    min="1"
                    max={view === 'live' ? currentWeek : 34}
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-accent"
                />
            </div>

            <div className="table-container overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-secondary border-b border-slate-700">
                            <th className="py-2 pl-2">#</th>
                            <th className="py-2">Équipe</th>
                            <th className="py-2 text-center">J</th>
                            <th className="py-2 text-center">Diff</th>
                            <th className="py-2 text-right pr-2">Pts</th>
                        </tr>
                    </thead>
                    <tbody>
                        {computedStandings.map((team, index) => (
                            <tr key={team.team} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                                <td className="py-2 pl-2" style={{ borderLeft: getRowBorder(index) }}>
                                    {index + 1}
                                </td>
                                <td className="py-2 font-bold flex items-center gap-2">
                                    {/* Placeholder for Logo if we had them */}
                                    {team.team}
                                </td>
                                <td className="py-2 text-center text-secondary">{team.played}</td>
                                <td className="py-2 text-center text-xs text-secondary">
                                    {team.gf - team.ga > 0 ? '+' : ''}{team.gf - team.ga}
                                </td>
                                <td className="py-2 text-right pr-2 font-bold text-accent text-base">
                                    {team.points}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Standings;

