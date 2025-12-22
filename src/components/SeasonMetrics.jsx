import React, { useState } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

const DATA_CURRENT = [
    { period: '0-15\'', goals: 45 },
    { period: '15-30\'', goals: 58 },
    { period: '30-45\'', goals: 72 },
    { period: '45-60\'', goals: 65 },
    { period: '60-75\'', goals: 85 },
    { period: '75-90\'', goals: 112 },
    { period: '90+\'', goals: 45 },
];

const DATA_LAST_SEASON = [
    { period: '0-15\'', goals: 40 },
    { period: '15-30\'', goals: 50 },
    { period: '30-45\'', goals: 60 },
    { period: '45-60\'', goals: 55 },
    { period: '60-75\'', goals: 70 },
    { period: '75-90\'', goals: 90 },
    { period: '90+\'', goals: 30 },
];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ backgroundColor: '#0F1C38', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', zIndex: 100 }}>
                <p style={{ fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>{label}</p>
                <p style={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Buts</p>
                <p style={{ color: '#CEF002', fontWeight: '900', fontSize: '24px' }}>{payload[0].value}</p>
            </div>
        );
    }
    return null;
};

const SeasonMetrics = () => {
    const [dataset, setDataset] = useState('current'); // 'current' or 'last'

    const currentData = dataset === 'current' ? DATA_CURRENT : DATA_LAST_SEASON;

    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h3 style={{ fontWeight: 'bold', color: 'white', fontSize: '1.125rem' }}>⏱️ Moment des Buts</h3>

                {/* Toggles */}
                <div style={{ display: 'flex', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', padding: '2px' }}>
                    <button
                        onClick={() => setDataset('current')}
                        style={{
                            fontSize: '10px',
                            padding: '4px 8px',
                            backgroundColor: dataset === 'current' ? '#CEF002' : 'transparent',
                            color: dataset === 'current' ? '#000' : '#94A3B8',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        2025
                    </button>
                    <button
                        onClick={() => setDataset('last')}
                        style={{
                            fontSize: '10px',
                            padding: '4px 8px',
                            backgroundColor: dataset === 'last' ? '#CEF002' : 'transparent',
                            color: dataset === 'last' ? '#000' : '#94A3B8',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        2024
                    </button>
                </div>
            </div>

            <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={currentData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                        <XAxis
                            dataKey="period"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
                        <Bar dataKey="goals" radius={[4, 4, 0, 0]} animationDuration={500}>
                            {currentData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={index === 5 ? '#CEF002' : '#334155'} // Highlight 'Money Time'
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div style={{ marginTop: '1rem', fontSize: '10px', textAlign: 'center', color: '#94a3b8' }}>
                Comparaison basculable entre la saison actuelle et précédente.
            </div>
        </div>
    );
};

export default SeasonMetrics;
