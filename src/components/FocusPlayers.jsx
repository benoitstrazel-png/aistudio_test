import React, { useMemo } from 'react';
import ALL_PLAYERS from '../data/players_optimized.json';
import TeamLogo from './ui/TeamLogo';

const FocusPlayers = ({ homeTeam, awayTeam }) => {

    // Normalization helper to match disparate team names
    const normalize = (str) => {
        if (!str) return '';
        return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    };

    const getTeamPlayers = (teamName) => {
        const target = normalize(teamName);
        // Special mapping for common mismatches if needed, but fuzzy match first
        return ALL_PLAYERS.filter(p => {
            const squad = normalize(p.Squad);
            return squad.includes(target) || target.includes(squad);
        });
    };

    // Prepare data
    const homeSquad = useMemo(() => {
        const players = getTeamPlayers(homeTeam);
        // Sort by Dangerousness (xG per 90 + Goals)
        return players.sort((a, b) => (b.xG || 0) - (a.xG || 0));
    }, [homeTeam]);

    const awaySquad = useMemo(() => {
        const players = getTeamPlayers(awayTeam);
        return players.sort((a, b) => (b.xG || 0) - (a.xG || 0));
    }, [awayTeam]);


    const renderSquadList = (teamName, players, isHome) => {
        if (!players || players.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center p-8 text-white/20 border border-white/5 rounded-xl bg-black/20">
                    <p className="text-sm font-bold uppercase mb-1">Données introuvables</p>
                    <p className="text-xs">Aucun joueur trouvé pour {teamName}</p>
                </div>
            );
        }

        const topPlayers = players.slice(0, 8); // Top 8 dangerous players

        return (
            <div className="flex flex-col gap-3">
                {topPlayers.map((p, idx) => {
                    // Calculate scoring probability (proxy)
                    // xG per 90 mins gives a rough probability per match
                    const minutes = p.Min || 1;
                    const matches90 = minutes / 90;
                    const xG90 = matches90 > 0 ? (p.xG / matches90) : 0;

                    // Cap at 99%, format as %
                    let prob = Math.min(xG90 * 100, 99).toFixed(0);

                    // Boost prob slightly based on recent form (fake logic for simulation feel if data lacking)
                    // But here we rely on xG stats directly.

                    if (isNaN(prob)) prob = 0;

                    return (
                        <div key={idx} className="flex items-center justify-between bg-[#1e293b]/50 p-3 rounded-lg border border-white/5 hover:border-accent/30 transition-all group">
                            <div className="flex items-center gap-3">
                                {/* Position Badge */}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border border-white/10 ${p.Pos?.includes('FW') ? 'bg-red-500/20 text-red-500 border-red-500/30' :
                                        p.Pos?.includes('MF') ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' :
                                            'bg-blue-500/20 text-blue-500 border-blue-500/30'
                                    }`}>
                                    {p.Pos?.split(',')[0]}
                                </div>

                                <div>
                                    <div className="font-bold text-white text-sm group-hover:text-accent transition-colors">
                                        {p.Player}
                                    </div>
                                    <div className="text-[10px] text-slate-400 flex gap-2">
                                        <span>{p.Gls} Buts</span>
                                        <span className="text-slate-600">•</span>
                                        <span>{p.xG} xG</span>
                                        <span className="text-slate-600">•</span>
                                        <span>{p.Min} min</span>
                                    </div>
                                </div>
                            </div>

                            {/* Scoring Probability */}
                            <div className="text-right">
                                <div className="text-[10px] uppercase text-slate-500 font-bold mb-0.5 tracking-wider">Ménace Off.</div>
                                <div className="flex items-center justify-end gap-2">
                                    <div className="h-1.5 w-12 bg-slate-700/50 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${parseInt(prob) > 30 ? 'bg-[#CEF002]' : 'bg-cyan-400'}`}
                                            style={{ width: `${Math.min(prob, 100)}%` }}
                                        />
                                    </div>
                                    <span className={`font-black font-mono text-sm ${parseInt(prob) > 30 ? 'text-[#CEF002]' : 'text-white'}`}>
                                        {prob}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {players.length > 8 && (
                    <div className="text-center text-[10px] text-slate-500 mt-2 italic hover:text-white cursor-pointer transition-colors">
                        Voir les {players.length - 8} autres joueurs dans l'onglet Focus...
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="w-full">
            <div className="flex items-center justify-center gap-3 mb-8">
                <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent w-full max-w-[100px]" />
                <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                    <span className="text-2xl">🔥</span>
                    Forces en Présence
                    <span className="bg-accent text-black text-[10px] font-bold px-2 py-0.5 rounded ml-2">DATA KAGGLE</span>
                </h3>
                <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent w-full max-w-[100px]" />
            </div>

            <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">
                {/* DOMICILE */}
                <div>
                    <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-4">
                        <TeamLogo teamName={homeTeam} size="md" />
                        <div>
                            <h4 className="font-black text-2xl text-white uppercase italic">{homeTeam}</h4>
                            <p className="text-xs text-accent uppercase tracking-widest font-bold">Menace Offensive</p>
                        </div>
                    </div>
                    {renderSquadList(homeTeam, homeSquad, true)}
                </div>

                {/* VISITEUR */}
                <div>
                    <div className="flex items-center justify-end gap-4 mb-6 border-b border-white/10 pb-4 text-right">
                        <div>
                            <h4 className="font-black text-2xl text-white uppercase italic">{awayTeam}</h4>
                            <p className="text-xs text-red-500 uppercase tracking-widest font-bold">Menace Offensive</p>
                        </div>
                        <TeamLogo teamName={awayTeam} size="md" />
                    </div>
                    {renderSquadList(awayTeam, awaySquad, false)}
                </div>
            </div>
        </div>
    );
};

export default FocusPlayers;
