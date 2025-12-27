import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';

const NextMatchRadar = ({ homeTeam, awayTeam, teamStats }) => {
    const homeStats = teamStats[homeTeam] || { att: 1, def: 1 };
    const awayStats = teamStats[awayTeam] || { att: 1, def: 1 };

    // Convert raw stats to 0-100 scale for Radar
    // Att: 1.0 is avg. Max 2.0 -> 100
    // Def: 1.0 is avg (lower is better? No, here "Strength" usually means higher is better. 
    // But in our python, 'def' was goals conceded ratio (lower is good). 
    // Let's invert Def for display: (2.5 - def) * 40

    const hAtt = Math.min(100, Math.max(20, homeStats.att * 50));
    const aAtt = Math.min(100, Math.max(20, awayStats.att * 50));

    const hDef = Math.min(100, Math.max(20, (2.5 - (homeStats.def || 1)) * 50)); // Invert: Less goals conceded = Higher Defense Score
    const aDef = Math.min(100, Math.max(20, (2.5 - (awayStats.def || 1)) * 50));

    const data = [
        { subject: 'Attaque', A: hAtt, B: aAtt, fullMark: 100 },
        { subject: 'Défense', A: hDef, B: aDef, fullMark: 100 },
        { subject: 'Possession', A: 50 + (hAtt - aAtt) / 2, B: 50 + (aAtt - hAtt) / 2, fullMark: 100 }, // Simulated based on attack diff
        { subject: 'Forme', A: hAtt * 0.9 + 10, B: aAtt * 0.9 + 10, fullMark: 100 },
        { subject: 'Danger', A: (hAtt + aDef) / 2, B: (aAtt + hDef) / 2, fullMark: 100 },
    ];

    return (
        <div className="card flex flex-col items-center w-full">
            {/* Title removed for layout optimization */}
            <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                    <RadarChart cx="50%" cy="50%" outerRadius="85%" data={data}>
                        <PolarGrid stroke="#475569" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name={homeTeam} dataKey="A" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.5} />
                        <Radar name={awayTeam} dataKey="B" stroke="#f87171" fill="#f87171" fillOpacity={0.5} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default NextMatchRadar;
