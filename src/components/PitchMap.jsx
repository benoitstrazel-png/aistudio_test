
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

    const PlayerNode = ({ player, top, left }) => {
        const { goals, assists } = getPlayerStats(player.name);
        const hasStats = goals > 0 || assists > 0;
        const photoUrl = getPlayerPhoto(clubName, player.name);

        return (
            <div
                className="absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                style={{ top, left }}
            >
                {/* Photo / Dot */}
                <div className={`relative w-12 h-12 rounded-full border-2 flex items-center justify-center shadow-lg transition-all overflow-hidden ${hasStats ? 'border-accent scale-110' : 'border-slate-500'
                    } bg-slate-800`}>
                    {photoUrl ? (
                        <img
                            src={photoUrl}
                            alt={player.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                    ) : (
                        <span className={`text-xs font-bold ${hasStats ? 'text-accent' : 'text-slate-400'}`}>
                            {player.rating}
                        </span>
                    )}

                    {/* Badge for Rating if photo exists */}
                    {photoUrl && (
                        <div className="absolute bottom-0 right-0 bg-accent text-[#0B1426] text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-[#0B1426]">
                            {Math.floor(player.rating)}
                        </div>
                    )}
                </div>

                {/* Name Label */}
                <div className="mt-1 bg-black/60 px-2 py-0.5 rounded text-[9px] text-white font-bold whitespace-nowrap backdrop-blur-sm">
                    {player.name.split(' ').pop()}
                </div>

                {/* Tooltip */}
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
        <div className="card bg-[#1a2c2c] p-4 flex flex-col items-center h-full min-h-[400px]">
            <h4 className="text-secondary text-xs uppercase font-bold mb-4 w-full text-left">Tactique & Efficacité (Top XI)</h4>

            <div className="relative w-full flex-grow bg-emerald-900/80 rounded-lg border-2 border-emerald-800/50 overflow-hidden shadow-inner">
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div className="absolute top-1/2 left-0 w-full h-px bg-white"></div>
                    <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white"></div>
                    <div className="absolute top-1/2 left-1/2 w-24 h-24 border border-white rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute top-0 left-1/2 w-32 h-16 border border-white transform -translate-x-1/2 border-t-0"></div>
                    <div className="absolute bottom-0 left-1/2 w-32 h-16 border border-white transform -translate-x-1/2 border-b-0"></div>
                </div>

                {/* GK */}
                {bestXI.G?.map((p, i) => <PlayerNode key={i} player={p} top="90%" left="50%" />)}

                {/* DEF (4) */}
                {bestXI.D?.map((p, i) => <PlayerNode key={i} player={p} top="75%" left={`${20 + i * 20}%`} />)}

                {/* MID (3) */}
                {bestXI.M?.map((p, i) => <PlayerNode key={i} player={p} top="50%" left={`${30 + i * 20}%`} />)}

                {/* ATT (3) */}
                {bestXI.A?.map((p, i) => <PlayerNode key={i} player={p} top="25%" left={`${20 + i * 30}%`} />)}
            </div>
        </div>
    );
};

export default PitchMap;
