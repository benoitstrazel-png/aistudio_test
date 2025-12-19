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

    // Render a single match result bubble
    const renderMatchBubble = (item, index) => {
        const { res, score, opponent } = item;
        let bgClass = "bg-gray-700 border-gray-600";
        let textClass = "text-gray-300";

        if (res === 'V') { bgClass = "bg-[#CEF002]/20 border-[#CEF002]/50"; textClass = "text-[#CEF002]"; }
        if (res === 'N') { bgClass = "bg-orange-400/20 border-orange-400/50"; textClass = "text-orange-400"; }
        if (res === 'D') { bgClass = "bg-red-500/20 border-red-500/50"; textClass = "text-red-400"; }

        return (
            <div key={index} className="flex flex-col items-center group relative cursor-help">
                {/* Bubble */}
                <div className={`w-10 h-10 flex items-center justify-center rounded-full border-2 ${bgClass} ${textClass} font-black text-sm mb-1 shadow-lg`}>
                    {res}
                </div>
                {/* Score */}
                <span className="text-[10px] font-mono text-white/70 tracking-widest">{score}</span>

                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max px-3 py-1.5 bg-black/90 border border-white/10 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    <span className="text-secondary mr-1">vs</span>
                    <span className="font-bold">{opponent}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="card bg-transparent !p-0 border-none">
            <div className="flex items-center mb-6">
                <h2 className="text-white text-sm uppercase tracking-widest font-bold border-l-4 border-accent pl-3">
                    Historique Récent
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Team A History */}
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <h3 className="text-secondary text-xs uppercase tracking-wider mb-4 flex justify-between items-center">
                        <span className="text-accent font-bold">{homeTeam}</span>
                        <span className="opacity-50">à Domicile</span>
                    </h3>
                    <div className="flex justify-between items-start gap-2">
                        {history.lastHome.length > 0 ? history.lastHome.map((m, i) => renderMatchBubble(m, i)) : <span className="text-xs text-secondary italic">Aucune donnée</span>}
                    </div>
                </div>

                {/* Team B History */}
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <h3 className="text-secondary text-xs uppercase tracking-wider mb-4 flex justify-between items-center">
                        <span className="text-red-400 font-bold">{awayTeam}</span>
                        <span className="opacity-50">à l'Extérieur</span>
                    </h3>
                    <div className="flex justify-between items-start gap-2">
                        {history.lastAway.length > 0 ? history.lastAway.map((m, i) => renderMatchBubble(m, i)) : <span className="text-xs text-secondary italic">Aucune donnée</span>}
                    </div>
                </div>
            </div>

            {/* H2H Table */}
            <div className="bg-black/20 rounded-xl border border-white/5 overflow-hidden">
                <div className="bg-white/5 px-4 py-3 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-white text-xs uppercase tracking-wider font-bold">Face à Face</h3>
                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-secondary">5 derniers matchs</span>
                </div>

                <table className="w-full text-sm text-left border-collapse">
                    <tbody className="divide-y divide-white/5">
                        {history.h2h.map((h, i) => (
                            <tr key={i} className="hover:bg-white/5 transition-colors group">
                                <td className="p-3 text-secondary text-xs w-32 font-mono">{h.date}</td>
                                <td className="p-3">
                                    <div className="flex items-center gap-3">
                                        <span className={`font-bold transition-all ${h.home === homeTeam ? "text-accent scale-105" : "text-white/70"}`}>{h.home}</span>
                                        <span className="text-secondary text-[10px] font-light uppercase px-1">vs</span>
                                        <span className={`font-bold transition-all ${h.away === awayTeam ? "text-red-400 scale-105" : "text-white/70"}`}>{h.away}</span>
                                    </div>
                                </td>
                                <td className="p-3 text-right">
                                    <span className="bg-black/40 px-2 py-1 rounded font-mono font-black text-white tracking-widest">{h.score}</span>
                                </td>
                            </tr>
                        ))}
                        {history.h2h.length === 0 && (
                            <tr><td colSpan="3" className="p-4 text-center text-xs text-secondary italic">Aucun historique récent.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MatchHistory;
