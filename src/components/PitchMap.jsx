import React, { useMemo } from 'react';
import { getPlayerPhoto } from '../utils/playerPhotos';

const PitchMap = ({ clubName, roster, stats }) => {
    // 1. Filter roster by position
    const bestXI = useMemo(() => {
        if (!roster || roster.length === 0) return {};

        const getBest = (pos, count) => {
            return roster
                .filter(p => p.position === pos)
                .sort((a, b) => b.rating - a.rating)
                .slice(0, count);
        };

        return {
            G: getBest('G', 1),
            D: getBest('D', 4),
            M: getBest('M', 3),
            A: getBest('A', 3),
        };
    }, [roster]);

    // 2. Helper to get dynamic stats
    const getPlayerStats = (name) => {
        let goals = 0;
        let assists = 0;

        const lastName = name.split(' ').pop();

        if (stats && stats.scorers) {
            Object.entries(stats.scorers).forEach(([sName, sCount]) => {
                if (sName.toLowerCase().includes(lastName.toLowerCase())) goals = sCount;
            });
        }

        if (stats && stats.assisters) {
            Object.entries(stats.assisters).forEach(([aName, aCount]) => {
                if (aName.toLowerCase().includes(lastName.toLowerCase())) assists = aCount;
            });
        }

        return { goals, assists };
    };

    // 3. Tactical positioning logic with anti-collision
    const getPlayerPosition = (position, index, totalInPosition) => {
        const positions = {
            G: { top: 90, left: 50 },
            D: {
                top: 75,
                getLeft: (i, total) => {
                    if (total === 1) return 50;
                    if (total === 2) return i === 0 ? 35 : 65;
                    if (total === 3) return [25, 50, 75][i];
                    // 4 defenders: LB, CB1, CB2, RB
                    return [15, 38, 62, 85][i];
                }
            },
            M: {
                top: 50,
                getLeft: (i, total) => {
                    if (total === 1) return 50;
                    if (total === 2) return i === 0 ? 35 : 65;
                    // 3 midfielders
                    return [30, 50, 70][i];
                }
            },
            A: {
                top: 20,
                getLeft: (i, total) => {
                    if (total === 1) return 50;
                    if (total === 2) return i === 0 ? 35 : 65;
                    // 3 attackers
                    return [25, 50, 75][i];
                }
            }
        };

        const pos = positions[position];
        if (!pos) return { top: 50, left: 50 };

        if (position === 'G') {
            return pos;
        }

        return {
            top: pos.top,
            left: pos.getLeft(index, totalInPosition)
        };
    };

    const PlayerNode = ({ player, position, index, total }) => {
        const { goals, assists } = getPlayerStats(player.name);
        const hasStats = goals > 0 || assists > 0;
        const photoUrl = getPlayerPhoto(clubName, player.name);
        const coords = getPlayerPosition(position, index, total);

        return (
            <div
                className="absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                style={{ top: `${coords.top}%`, left: `${coords.left}%` }}
            >
                {/* Photo / Dot */}
                <div className={`relative w-10 h-10 rounded-full border-2 flex items-center justify-center shadow-lg transition-all overflow-hidden ${hasStats ? 'border-accent scale-110' : 'border-slate-400'
                    } bg-slate-800`}>
                    {photoUrl ? (
                        <img
                            src={photoUrl}
                            alt={player.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                    ) : (
                        <span className={`text-[10px] font-bold ${hasStats ? 'text-accent' : 'text-slate-400'}`}>
                            {player.rating}
                        </span>
                    )}

                    {/* Badge for Rating */}
                    {photoUrl && (
                        <div className="absolute bottom-0 right-0 bg-accent text-[#0B1426] text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-[#0B1426]">
                            {Math.floor(player.rating)}
                        </div>
                    )}
                </div>

                {/* Name Label */}
                <div className="mt-1 bg-black/70 px-1.5 py-0.5 rounded text-[8px] text-white font-bold whitespace-nowrap backdrop-blur-sm border border-white/20">
                    {player.name.split(' ').pop()}
                </div>

                {/* Stats Badge */}
                {hasStats && (
                    <div className="flex gap-0.5 mt-0.5">
                        {goals > 0 && (
                            <div className="bg-accent/90 text-[#0B1426] px-1 py-0.5 rounded text-[7px] font-black">
                                ⚽{goals}
                            </div>
                        )}
                        {assists > 0 && (
                            <div className="bg-blue-400/90 text-white px-1 py-0.5 rounded text-[7px] font-black">
                                🎯{assists}
                            </div>
                        )}
                    </div>
                )}

                {/* Hover Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block z-50 pointer-events-none">
                    <div className="bg-slate-900 border border-slate-600 rounded p-2 shadow-xl text-xs w-32">
                        <div className="font-bold text-white border-b border-white/10 pb-1 mb-1">{player.name}</div>
                        <div className="flex justify-between text-slate-300">
                            <span>Note:</span> <span className="text-yellow-400 font-bold">{player.rating}</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                            <span>Buts:</span> <span className="text-accent font-bold">{goals}</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                            <span>Passes:</span> <span className="text-blue-400 font-bold">{assists}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="card bg-[#1a2c2c] p-4 flex flex-col items-center h-full min-h-[500px]">
            <h4 className="text-secondary text-xs uppercase font-bold mb-4 w-full text-left">⚡ Tactique & Efficacité (Top XI)</h4>

            {/* PITCH CONTAINER */}
            <div className="pitch-container relative w-full" style={{ aspectRatio: '2/3', maxHeight: '600px' }}>
                {/* Background and Lines */}
                <div className="absolute inset-0 bg-[#38a055] border-2 border-white/80 rounded-lg overflow-hidden">
                    {/* Midline */}
                    <div className="pitch-line-mid absolute top-1/2 w-full h-px bg-white/60"></div>

                    {/* Center Circle */}
                    <div className="pitch-circle absolute top-1/2 left-1/2 w-1/5 aspect-square transform -translate-x-1/2 -translate-y-1/2 border border-white/60 rounded-full"></div>

                    {/* Top Penalty Box (Opponent) */}
                    <div className="pitch-box-top absolute top-0 left-1/2 transform -translate-x-1/2 w-3/5 h-[16%] border border-white/60 border-t-0"></div>

                    {/* Bottom Penalty Box (Our GK) */}
                    <div className="pitch-box-bottom absolute bottom-0 left-1/2 transform -translate-x-1/2 w-3/5 h-[16%] border border-white/60 border-b-0">
                        {/* Small box */}
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-2/3 h-[38%] border border-white/60 border-b-0"></div>
                    </div>

                    {/* Top Small Box */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-2/5 h-[6%] border border-white/60 border-t-0"></div>
                </div>

                {/* PLAYERS */}
                {bestXI.G?.map((p, i) => <PlayerNode key={`g-${i}`} player={p} position="G" index={i} total={bestXI.G.length} />)}
                {bestXI.D?.map((p, i) => <PlayerNode key={`d-${i}`} player={p} position="D" index={i} total={bestXI.D.length} />)}
                {bestXI.M?.map((p, i) => <PlayerNode key={`m-${i}`} player={p} position="M" index={i} total={bestXI.M.length} />)}
                {bestXI.A?.map((p, i) => <PlayerNode key={`a-${i}`} player={p} position="A" index={i} total={bestXI.A.length} />)}
            </div>
        </div>
    );
};

export default PitchMap;
