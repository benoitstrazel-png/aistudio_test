import React, { useMemo } from 'react';
import MATCHES_LEGACY from '../data/matches_legacy.json';

const MatchHistory = ({ match }) => {
    const { homeTeam, awayTeam } = match;

    // Compute history dynamically
    const history = useMemo(() => {
        // 1. Last Home games for Home Team
        const lastHome = MATCHES_LEGACY
            .filter(m => m.home_team === homeTeam)
            .slice(-5)
            .map(m => {
                const hg = m.full_time_home_goals;
                const ag = m.full_time_away_goals;
                const opponent = m.away_team;
                let res = 'N';
                if (hg > ag) res = 'V';
                if (ag > hg) res = 'D';
                return { res, score: `${hg}-${ag}`, opponent };
            }).reverse();

        // 2. Last Away games for Away Team
        const lastAway = MATCHES_LEGACY
            .filter(m => m.away_team === awayTeam)
            .slice(-5)
            .map(m => {
                const hg = m.full_time_home_goals;
                const ag = m.full_time_away_goals;
                const opponent = m.home_team;
                let res = 'N';
                if (ag > hg) res = 'V';
                if (hg > ag) res = 'D';
                return { res, score: `${ag}-${hg}`, opponent }; // Score from away perspective
            }).reverse();

        // 3. H2H
        const h2h = MATCHES_LEGACY
            .filter(m => (m.home_team === homeTeam && m.away_team === awayTeam) || (m.home_team === awayTeam && m.away_team === homeTeam))
            .slice(-5)
            .map(m => ({
                date: m.date,
                home: m.home_team,
                away: m.away_team,
                score: `${m.full_time_home_goals}-${m.full_time_away_goals}`
            }))
            .reverse();

        return { lastHome, lastAway, h2h };
    }, [homeTeam, awayTeam]);

    const renderBadge = (item) => {
        const { res, score, opponent } = item;
        let bgClass = "bg-gray-700";
        if (res === 'V') bgClass = "bg-green-500/20 text-green-400 border-green-500/50";
        if (res === 'N') bgClass = "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
        if (res === 'D') bgClass = "bg-red-500/20 text-red-400 border-red-500/50";

        return (
            <div
                className={`w-8 h-8 flex items-center justify-center rounded border ${bgClass} text-xs font-bold cursor-help transition-transform hover:scale-110 relative group`}
            >
                {res}

                {/* TOOLTIP ON HOVER */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                    vs {opponent} ({score})
                </div>
            </div>
        );
    };

    return (
        <div className="card bg-transparent !p-0 border-none">
            <div className="flex items-center mb-4">
                <h2 className="text-secondary text-sm uppercase tracking-widest font-bold">Historique Récent</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <h3 className="text-secondary text-[10px] uppercase tracking-wider mb-2 opacity-50">{homeTeam} (à Domicile)</h3>
                    <div className="flex gap-2">
                        {history.lastHome.map((item, i) => (
                            <React.Fragment key={i}>{renderBadge(item)}</React.Fragment>
                        ))}
                        {history.lastHome.length === 0 && <span className="text-secondary text-xs">Aucune donnée</span>}
                    </div>
                </div>
                <div>
                    <h3 className="text-secondary text-[10px] uppercase tracking-wider mb-2 opacity-50">{awayTeam} (à l'Extérieur)</h3>
                    <div className="flex gap-2">
                        {history.lastAway.map((item, i) => (
                            <React.Fragment key={i}>{renderBadge(item)}</React.Fragment>
                        ))}
                        {history.lastAway.length === 0 && <span className="text-secondary text-xs">Aucune donnée</span>}
                    </div>
                </div>
            </div>

            <div className="bg-black/20 rounded-xl p-4 overflow-hidden">
                <h3 className="text-secondary text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span>Face à Face</span>
                    <span className="bg-white/10 px-1.5 py-0.5 rounded text-[9px] text-white">Derniers 5</span>
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                        <tbody className="divide-y divide-white/5">
                            {history.h2h.map((h, i) => (
                                <tr key={i} className="hover:bg-white/5 transition-colors">
                                    <td className="p-2 text-secondary w-24 whitespace-nowrap">{h.date}</td>
                                    <td className="p-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`font-bold ${h.home === homeTeam ? "text-accent" : "text-white"}`}>{h.home}</span>
                                            <span className="text-secondary text-[10px]">vs</span>
                                            <span className={`font-bold ${h.away === awayTeam ? "text-accent" : "text-white"}`}>{h.away}</span>
                                        </div>
                                    </td>
                                    <td className="p-2 font-mono font-black text-right">{h.score}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MatchHistory;
