import React, { useState } from 'react';

const Standings = ({ standings }) => {
    const [view, setView] = useState('live'); // 'live' or 'projected'

    const sortedStandings = [...standings].sort((a, b) => {
        const pointsA = view === 'live' ? a.points : a.projectedPoints;
        const pointsB = view === 'live' ? b.points : b.projectedPoints;
        return pointsB - pointsA;
    });

    return (
        <div className="card">
            <div className="flex justify-between items-center mb-4">
                <h2>Classement</h2>
                <div className="flex gap-2">
                    <button
                        className="text-xs"
                        style={{ opacity: view === 'live' ? 1 : 0.5 }}
                        onClick={() => setView('live')}
                    >
                        Live
                    </button>
                    <button
                        className="text-xs"
                        style={{ opacity: view === 'projected' ? 1 : 0.5 }}
                        onClick={() => setView('projected')}
                    >
                        Projection Saison
                    </button>
                </div>
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
                        {sortedStandings.map((team, index) => (
                            <tr key={team.team} style={{
                                borderLeft: index < 3 ? '4px solid var(--success-color)' : index > 15 ? '4px solid var(--danger-color)' : 'none'
                            }}>
                                <td>{index + 1}</td>
                                <td className="font-bold">{team.team}</td>
                                <td>{view === 'live' ? team.played : 34}</td>
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
