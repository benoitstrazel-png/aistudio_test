import React from 'react';

const PlayerStats = ({ players, homeTeam, awayTeam }) => {
    // Filter players belonging to the two teams in the match
    const relevantPlayers = players.filter(p => p.team === homeTeam || p.team === awayTeam);

    return (
        <div className="card">
            <h2 style={{ marginBottom: '1.5rem' }}>Joueurs à suivre</h2>

            <div className="flex flex-col gap-3">
                {relevantPlayers.map(player => (
                    <div key={player.name} className="glass-card flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                            <div
                                style={{
                                    width: 10, height: 10, borderRadius: '50%',
                                    backgroundColor: player.status === 'form' ? 'var(--success-color)' : player.status === 'slump' ? 'var(--danger-color)' : 'var(--warning-color)'
                                }}
                            />
                            <div>
                                <p className="font-bold">{player.name}</p>
                                <p className="text-secondary text-xs">{player.team}</p>
                            </div>
                        </div>

                        <div className="text-right text-xs text-secondary">
                            <div>But: <span className="text-primary">{player.chanceGoal}%</span></div>
                            <div>Passe: <span className="text-primary">{player.chanceAssist}%</span></div>
                            <div>Rouge: <span className="text-danger">{player.chanceCard}%</span></div>
                        </div>
                    </div>
                ))}
                {relevantPlayers.length === 0 && <p className="text-secondary">Aucune donnée joueur pour ce match.</p>}
            </div>
        </div>
    );
};

export default PlayerStats;
