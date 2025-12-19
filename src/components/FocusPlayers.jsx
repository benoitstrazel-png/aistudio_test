import React from 'react';
import REAL_PLAYERS from '../data/real_players.json';
import TeamLogo from './ui/TeamLogo';

const FocusPlayers = ({ homeTeam, awayTeam }) => {
    // Check coverage
    const homeSquad = REAL_PLAYERS[homeTeam] || REAL_PLAYERS[Object.keys(REAL_PLAYERS).find(k => k.includes(homeTeam))];
    const awaySquad = REAL_PLAYERS[awayTeam] || REAL_PLAYERS[Object.keys(REAL_PLAYERS).find(k => k.includes(awayTeam))];

    // If neither team has data, don't show component to avoid clutter, or show empty state?
    // User requested "Focus sur les joueurs". It's better to show it only if we have at least one team.
    if (!homeSquad && !awaySquad) {
        return null;
    }

    const renderSquad = (teamName, squad) => {
        if (!squad) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-white/20 min-h-[200px]">
                    <p className="text-xs uppercase font-bold">Données Effectif Non Disponibles</p>
                    <p className="text-[10px]">Scraping requis pour {teamName}</p>
                </div>
            );
        }

        // Sort by Rating (Stars)
        const topPlayers = [...squad].sort((a, b) => b.rating - a.rating).slice(0, 8); // Show top 8

        return (
            <div className="flex flex-col gap-2">
                {topPlayers.map((player, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white/5 p-2 rounded border border-white/5 hover:border-accent/50 transition-colors group">
                        <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold ${player.position === 'G' ? 'bg-yellow-600' :
                                player.position === 'D' ? 'bg-blue-600' :
                                    player.position === 'M' ? 'bg-green-600' : 'bg-red-600'
                                }`}>
                                {player.position}
                            </span>
                            <div className="flex flex-col">
                                <span className="font-bold text-sm text-white group-hover:text-accent transition-colors">{player.name}</span>
                                {player.mj !== undefined ? (
                                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono mt-0.5">
                                        <span className="bg-white/5 px-1 rounded">MJ: <span className="text-white">{player.mj}</span></span>
                                        <span className="bg-white/5 px-1 rounded">B: <span className="text-accent">{player.goals}</span></span>
                                        <span className="bg-white/5 px-1 rounded">P: <span className="text-blue-400">{player.assists}</span></span>
                                    </div>
                                ) : (
                                    <span className="text-[10px] text-secondary">Note moyenne: {player.rating}</span>
                                )}
                            </div>
                        </div>
                        <div className="font-mono font-bold text-accent">
                            {/* Stars fake visual based on rating */}
                            <div className="flex gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className={`w-1 h-3 rounded-full ${i < Math.floor(player.rating - 2) ? 'bg-[#CEF002]' : 'bg-white/10'}`} />
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
                {squad.length > 8 && (
                    <div className="text-center text-[10px] text-secondary mt-1 italic">
                        + {squad.length - 8} autres joueurs...
                    </div>
                )}
            </div>
        );
    };

    return (
        <section className="mt-8">
            <div className="flex items-center gap-2 mb-4">
                <div className="bg-purple-600 text-white font-black px-2 py-1 rounded text-xs uppercase">
                    Scout & Data
                </div>
                <h3 className="section-title text-sm m-0">Focus Effectifs & Joueurs Clés</h3>
            </div>

            <div className="card border border-white/5 shadow-2xl bg-[#131b2e]">
                <div className="grid md:grid-cols-2 gap-8 divide-x divide-white/5">

                    {/* HOME SQUAD */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3 border-b border-white/5 pb-2">
                            <TeamLogo teamName={homeTeam} size="md" />
                            <h4 className="font-bold uppercase tracking-widest">{homeTeam}</h4>
                        </div>
                        {renderSquad(homeTeam, homeSquad)}
                    </div>

                    {/* AWAY SQUAD */}
                    <div className="flex flex-col gap-4 pl-0 md:pl-8">
                        <div className="flex items-center justify-end md:justify-start gap-3 border-b border-white/5 pb-2 flex-row-reverse md:flex-row">
                            <TeamLogo teamName={awayTeam} size="md" />
                            <h4 className="font-bold uppercase tracking-widest">{awayTeam}</h4>
                        </div>
                        {renderSquad(awayTeam, awaySquad)}
                    </div>

                </div>

                <div className="mt-4 pt-4 border-t border-white/5 text-center">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                        Effectifs Officiels Confirmés
                    </p>
                </div>
            </div>
        </section>
    );
};

export default FocusPlayers;
