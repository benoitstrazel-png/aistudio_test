import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';

const NextMatchRadar = ({ homeTeam, awayTeam, teamStats }) => {
    const homeStats = teamStats[homeTeam];
    const awayStats = teamStats[awayTeam];

    if (!homeStats || !awayStats) return <div className="card">Données manquantes pour le radar</div>;

    const data = [
        { subject: 'Attaque', A: homeStats.goals * 20, B: awayStats.goals * 20, fullMark: 100 }, // Scaled roughly
        { subject: 'Défense', A: homeStats.defense, B: awayStats.defense, fullMark: 100 },
        { subject: 'Possession', A: homeStats.possession, B: awayStats.possession, fullMark: 100 },
        { subject: 'Corners', A: homeStats.corners * 10, B: awayStats.corners * 10, fullMark: 100 },
        { subject: 'Discipline', A: homeStats.discipline, B: awayStats.discipline, fullMark: 100 },
    ];

    return (
        <div className="card flex flex-col items-center">
            <h2 className="text-secondary w-full text-left">Comparatif Performance</h2>
            <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                        <PolarGrid stroke="#94a3b8" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#f8fafc', fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name={homeTeam} dataKey="A" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.4} />
                        <Radar name={awayTeam} dataKey="B" stroke="#f87171" fill="#f87171" fillOpacity={0.4} />
                        <Legend />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default NextMatchRadar;
