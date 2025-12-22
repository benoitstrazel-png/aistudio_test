import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    ReferenceArea
} from 'recharts';

// Mock Data Generation
const generateData = () => {
    const data = [];
    const currentMatchday = 16;
    const totalDays = 34;
    let value = 28;

    for (let i = 1; i <= totalDays; i++) {
        const change = (Math.random() - 0.5) * 8;
        let nextValue = value + change;
        nextValue = Math.max(20, Math.min(35, nextValue));

        if (i < currentMatchday) {
            data.push({ name: `J${i}`, real: Math.round(nextValue), projected: null });
            value = nextValue;
        } else if (i === currentMatchday) {
            data.push({ name: `J${i}`, real: Math.round(nextValue), projected: Math.round(nextValue) });
            value = nextValue;
        } else {
            data.push({ name: `J${i}`, real: null, projected: Math.round(nextValue) });
            value = nextValue;
        }
    }
    return data;
};

const DATA = generateData();

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const val = payload[0].value || payload[1]?.value;
        const type = payload[0].dataKey === 'real' ? 'Réel' : 'Projeté';
        return (
            <div style={{ backgroundColor: '#0F1C38', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', zIndex: 100 }}>
                <p style={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}>{label}</p>
                <p style={{ color: '#CEF002', fontSize: '14px' }}>
                    {type}: <span style={{ fontFamily: 'monospace', fontSize: '16px' }}>{val}</span> buts
                </p>
            </div>
        );
    }
    return null;
};

const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    if (payload.name === 'J16') {
        return (
            <svg x={cx - 8} y={cy - 8} width={16} height={16} fill="none" viewBox="0 0 16 16">
                <circle cx="8" cy="8" r="8" fill="#CEF002" opacity="0.4" />
                <circle cx="8" cy="8" r="4" fill="#CEF002" stroke="white" strokeWidth="2" />
            </svg>
        );
    }
    return null;
};

const SeasonGoalsChart = () => {
    return (
        <div style={{ width: '100%', marginTop: '1rem' }}>
            {/* Legend / Periods */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '10px', fontSize: '12px', color: '#94A3B8' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#fff' }}></span>
                    <span>Phase Aller (J1-J17)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#CEF002' }}></span>
                    <span>Phase Retour (J18-J34)</span>
                </div>
            </div>

            <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={DATA} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="gradientReal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#CEF002" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#CEF002" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={true} horizontal={false} stroke="#ffffff10" strokeDasharray="3 3" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                            interval={2}
                        />
                        <YAxis
                            hide={false}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                            domain={[0, 40]}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'white', strokeWidth: 1, strokeDasharray: '4 4' }} />

                        <ReferenceLine x="J17" stroke="#ffffff10" label={{ value: 'Mi-Saison', position: 'top', fill: '#94A3B8', fontSize: 10 }} />

                        <Line
                            type="monotone"
                            dataKey="real"
                            stroke="#FFFFFF"
                            strokeWidth={3}
                            dot={false}
                            activeDot={false}
                            connectNulls={false}
                            style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.3))" }}
                        />

                        <Line
                            type="monotone"
                            dataKey="projected"
                            stroke="#CEF002"
                            strokeWidth={3}
                            strokeDasharray="5 5"
                            dot={<CustomDot />}
                            activeDot={{ r: 6, fill: "#CEF002", stroke: "white" }}
                            style={{ opacity: 0.7 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default SeasonGoalsChart;
