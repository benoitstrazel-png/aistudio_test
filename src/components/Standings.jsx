import React, { useState, useMemo } from 'react';

const Standings = ({ standings: initialStandings, matches = [], currentWeek = 34 }) => {
    const [view, setView] = useState('live'); // 'live' or 'projected'
    const [selectedWeek, setSelectedWeek] = useState(currentWeek);

    // Calculate Standings based on SELECTED WEEK
    const computedStandings = useMemo(() => {
        // If no matches provided (e.g. initial load), use pre-calculated
        if (!matches || matches.length === 0) return initialStandings;

        // Filter matches up to selected week
        const relevantMatches = matches.filter(m => m.week <= selectedWeek);

        const stats = {};

        // Init empty stats for all teams found in initialStandings to ensure everyone is listed
        initialStandings.forEach(t => {
            stats[t.team] = { team: t.team, played: 0, points: 0, gd: 0, gf: 0, ga: 0 };
        });

        relevantMatches.forEach(m => {
            const h = m.home_team;
            const a = m.away_team;
            const hg = m.full_time_home_goals;
            const ag = m.full_time_away_goals;

            if (!stats[h]) stats[h] = { team: h, played: 0, points: 0, gd: 0 };
            if (!stats[a]) stats[a] = { team: a, played: 0, points: 0, gd: 0 };

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
        });

        const list = Object.values(stats);
        // Sort: Points > Diff > Attack (Ligue 1 Rules approx)
        list.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            const gdA = a.gf - a.ga;
            const gdB = b.gf - b.ga;
            return gdB - gdA;
        });

        // Add Projection logic (simple linear extrapolation)
        return list.map(t => ({
            ...t,
            projectedPoints: t.played > 0 ? Math.round((t.points / t.played) * 34) : 0
        }));

    }, [matches, selectedWeek, initialStandings]);

    // Handle Future Projection (Simulated visual only)
    // If selectedWeek > currentWeek, we could show "Simulated" 
    // but for now we limit slider to currentWeek to avoid complexity without backend sim.

    const displayList = [...computedStandings];
    if (view === 'projected') {
        displayList.sort((a, b) => b.projectedPoints - a.projectedPoints);
    }

    return (
        <div className="card">
            <div className="flex justify-between items-center mb-4">
                <h2>Classement</h2>
                <div className="flex gap-2 text-xs">
                    <button style={{ opacity: view === 'live' ? 1 : 0.5 }} onClick={() => setView('live')}>Live</button>
                    <button style={{ opacity: view === 'projected' ? 1 : 0.5 }} onClick={() => setView('projected')}>Proj.</button>
                </div>
            </div>

            <div className="mb-4 px-2">
                <label className="text-xs text-secondary mb-1 block">Journée: {selectedWeek} / {currentWeek}</label>
                <input
                    type="range"
                    min="1"
                    max={currentWeek}
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Équipe</th>
                            <th>J</th>
                            <th>Pts {view === 'projected' && '(Est.)'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayList.map((team, index) => (
                            <tr key={team.team} style={{
                                borderLeft: index < 3 ? '4px solid var(--success-color)' : index > 15 ? '4px solid var(--danger-color)' : 'none'
                            }}>
                                <td>{index + 1}</td>
                                <td className="font-bold">{team.team}</td>
                                <td>{team.played}</td>
                                <td className="font-bold text-accent">
                                    {view === 'live' ? team.points : team.projectedPoints}
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
