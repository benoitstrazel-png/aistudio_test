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

    const renderBadge = (res) => {
        const type = res.split(' ')[0]; // "W", "D", "L"
        let color = '#ccc';
        if (type === 'W') color = 'var(--success-color)';
        if (type === 'D') color = 'var(--warning-color)';
        if (type === 'L') color = 'var(--danger-color)';
        return <span style={{ color, fontWeight: 'bold', marginRight: '5px' }}>{type}</span>;
    };

    return (
        <div className="card">
            <h2 className="mb-4">Historique</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <h3 className="text-secondary text-sm mb-2">{homeTeam} (Derniers Dom.)</h3>
                    <div className="flex gap-2 text-sm flex-wrap">
                        {history.lastHome.map((h, i) => (
                            <span key={i} className="glass-card px-2 py-1">{renderBadge(h)} {h.split(' ')[1]}</span>
                        ))}
                        {history.lastHome.length === 0 && <span className="text-secondary">Pas de match récent</span>}
                    </div>
                </div>
                <div>
                    <h3 className="text-secondary text-sm mb-2">{awayTeam} (Derniers Ext.)</h3>
                    <div className="flex gap-2 text-sm flex-wrap">
                        {history.lastAway.map((h, i) => (
                            <span key={i} className="glass-card px-2 py-1">{renderBadge(h)} {h.split(' ')[1]}</span>
                        ))}
                        {history.lastAway.length === 0 && <span className="text-secondary">Pas de match récent</span>}
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
