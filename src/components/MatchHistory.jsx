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
                let res = 'D';
                if (hg > ag) res = 'W';
                if (ag > hg) res = 'L';
                return `${res} ${hg}-${ag}`;
            }).reverse();

        // 2. Last Away games for Away Team
        const lastAway = MATCHES_LEGACY
            .filter(m => m.away_team === awayTeam)
            .slice(-5)
            .map(m => {
                const hg = m.full_time_home_goals;
                const ag = m.full_time_away_goals;
                let res = 'D';
                if (ag > hg) res = 'W';
                if (hg > ag) res = 'L';
                return `${res} ${ag}-${hg}`; // Score from away perspective usually? Or just raw
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

    const renderBadge = (res, score, opponent) => {
        const type = res.split(' ')[0]; // "W", "D", "L"
        let bgClass = "bg-gray-700";
        if (type === 'W') bgClass = "bg-green-500/20 text-green-400 border-green-500/50";
        if (type === 'D') bgClass = "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
        if (type === 'L') bgClass = "bg-red-500/20 text-red-400 border-red-500/50";

        return (
            <div
                className={`w-8 h-8 flex items-center justify-center rounded border ${bgClass} text-xs font-bold cursor-help transition-transform hover:scale-110`}
                title={`vs ${opponent} (${score})`}
            >
                {type}
            </div>
        );
    };

    return (
        <div className="card">
            <div className="flex items-center mb-4">
                <h2>Historique</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <h3 className="text-secondary text-xs uppercase tracking-wider mb-3">{homeTeam} (Derniers Dom.)</h3>
                    <div className="flex gap-2">
                        {history.lastHome.map((h, i) => {
                            const parts = h.split(' ');
                            // Need to find opponent? Unfortunately matches_legacy logic above didn't save opponent name in string.
                            // Let's rely on tooltip showing score for now or update logic.
                            // Actually, let's keep it simple: Show Result letter, Hover shows score.
                            return <React.Fragment key={i}>{renderBadge(parts[0], parts[1], "?")}</React.Fragment>
                        })}
                        {history.lastHome.length === 0 && <span className="text-secondary text-xs">N/A</span>}
                    </div>
                </div>
                <div>
                    <h3 className="text-secondary text-xs uppercase tracking-wider mb-3">{awayTeam} (Derniers Ext.)</h3>
                    <div className="flex gap-2">
                        {history.lastAway.map((h, i) => {
                            const parts = h.split(' ');
                            return <React.Fragment key={i}>{renderBadge(parts[0], parts[1], "?")}</React.Fragment>
                        })}
                        {history.lastAway.length === 0 && <span className="text-secondary text-xs">N/A</span>}
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-secondary text-sm mb-2">Face à Face (Derniers 5)</h3>
                <table className="text-sm">
                    <tbody>
                        {history.h2h.map((h, i) => (
                            <tr key={i}>
                                <td className="text-secondary">{h.date}</td>
                                <td><span className={h.home === homeTeam ? "text-accent" : ""}>{h.home}</span> vs <span className={h.away === awayTeam ? "text-accent" : ""}>{h.away}</span></td>
                                <td className="font-bold text-right">{h.score}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MatchHistory;
