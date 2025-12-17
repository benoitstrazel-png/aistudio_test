import React from 'react';
import { MOCK_DATA } from '../data/mockData';

const MatchHistory = ({ match }) => {
    const { homeTeam, awayTeam } = match;
    const history = MOCK_DATA.history;

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
                    <h3 className="text-secondary text-sm mb-2">{homeTeam} (Domicile)</h3>
                    <div className="flex gap-2 text-sm flex-wrap">
                        {history[homeTeam]?.lastHome.map((h, i) => (
                            <span key={i} className="glass-card px-2 py-1">{renderBadge(h)} {h.split(' ')[1]}</span>
                        ))}
                    </div>
                </div>
                <div>
                    <h3 className="text-secondary text-sm mb-2">{awayTeam} (Extérieur)</h3>
                    <div className="flex gap-2 text-sm flex-wrap">
                        {history[awayTeam]?.lastAway.map((h, i) => (
                            <span key={i} className="glass-card px-2 py-1">{renderBadge(h)} {h.split(' ')[1]}</span>
                        ))}
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-secondary text-sm mb-2">Face à Face</h3>
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
