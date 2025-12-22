import React, { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';

const SeasonGoalsChart = ({ schedule = [], currentWeek = 1, teamStats = {} }) => {

    const data = useMemo(() => {
        if (!schedule || schedule.length === 0) return [];

        const TOTAL_WEEKS = 34;
        const processedData = [];
        let totalRealGoals = 0;
        let weeksWithData = 0;

        // 1. Calculate Real Data
        for (let w = 1; w < currentWeek; w++) {
            const matches = schedule.filter(m => m.week === w && m.status === 'FINISHED');
            const weekGoals = matches.reduce((acc, m) => acc + (m.score?.home || 0) + (m.score?.away || 0), 0);

            if (matches.length > 0) {
                totalRealGoals += weekGoals;
                weeksWithData++;
            }

            processedData.push({
                name: `J${w}`,
                real: matches.length > 0 ? weekGoals : null, // Handle missed weeks gracefully
                projected: null,
            });
        }

        // 2. Generate Projection
        // Instead of random walk, we predict based on matchups in schedule

        // Helper for Poisson distribution to simulate realistic score variance
        const getPoisson = (lambda) => {
            let L = Math.exp(-lambda);
            let p = 1.0;
            let k = 0;
            do {
                k++;
                p *= Math.random();
            } while (p > L);
            return k - 1;
        };

        for (let w = currentWeek; w <= TOTAL_WEEKS; w++) {
            const isTransition = w === currentWeek;

            // Find matches for this week
            const matches = schedule.filter(m => m.week === w);

            let projectedWeekGoals = 0;

            if (matches.length > 0) {
                matches.forEach(match => {
                    const homeTerm = teamStats[match.homeTeam] || { att: 1, def: 1 };
                    const awayTeam = teamStats[match.awayTeam] || { att: 1, def: 1 };

                    // Strength
                    const homeStrength = (homeTerm.att * awayTeam.def) * 1.15;
                    const awayStrength = (awayTeam.att * homeTerm.def);

                    // Expected Goals (Lambda)
                    const lambdaH = homeStrength * 1.35; // Adjusted slightly for L1 averages (~2.7 total)
                    const lambdaA = awayStrength * 1.05;

                    // SIMULATE Score (Integer) instead of Mean (Float)
                    // This introduces the variance the user asked for (0-0s, blowout games, etc.)
                    const goalsH = getPoisson(lambdaH);
                    const goalsA = getPoisson(lambdaA);

                    projectedWeekGoals += (goalsH + goalsA);
                });
            } else {
                // Fallback with noise if no schedule
                const avgGoals = weeksWithData > 0 ? totalRealGoals / weeksWithData : 25;
                // Add +/- 20% variance
                const noise = (Math.random() - 0.5) * (avgGoals * 0.4);
                projectedWeekGoals = avgGoals + noise;
            }

            // Round for display but keep float logic internally if we were doing accumulation? 
            // Chart expects numbers. Let's round to 1 decimal for smoother curve, or integer.
            // User asked for "realistic", integers are more realistic for discrete goals, but curve is nicer with decimals.
            // Let's do Math.round for the final value to show "Whole Goals predicted"
            const finalProjected = Math.round(projectedWeekGoals);

            if (isTransition) {
                // Dot at start
                processedData.push({
                    name: `J${w}`,
                    real: null,
                    projected: finalProjected,
                    isTransition: true
                });
            } else {
                processedData.push({
                    name: `J${w}`,
                    real: null,
                    projected: finalProjected
                });
            }
        }

        return processedData;
    }, [schedule, currentWeek, teamStats]);


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
                    {payload[0].dataKey === 'projected' && (
                        <p style={{ fontSize: '10px', color: '#94A3B8', marginTop: '4px' }}>Basé sur les stats des équipes</p>
                    )}
                </div>
            );
        }
        return null;
    };

    const CustomDot = (props) => {
        const { cx, cy, payload } = props;
        if (payload.isTransition) {
            return (
                <svg x={cx - 8} y={cy - 8} width={16} height={16} fill="none" viewBox="0 0 16 16">
                    <circle cx="8" cy="8" r="8" fill="#CEF002" opacity="0.4" />
                    <circle cx="8" cy="8" r="4" fill="#CEF002" stroke="white" strokeWidth="2" />
                </svg>
            );
        }
        return null;
    };

    return (
        <div style={{ width: '100%', marginTop: '1rem' }}>
            {/* Legend / Periods */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '10px', fontSize: '12px', color: '#94A3B8' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#fff' }}></span>
                    <span>Données Historiques</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#CEF002' }}></span>
                    <span>Projection IA (Basée sur calendrier)</span>
                </div>
            </div>

            <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
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
                            domain={[0, 'auto']}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'white', strokeWidth: 1, strokeDasharray: '4 4' }} />

                        <ReferenceLine x={`J${currentWeek}`} stroke="#ffffff10" label={{ value: "Aujourd'hui", position: 'top', fill: '#94A3B8', fontSize: 10 }} />

                        <Line
                            type="monotone"
                            dataKey="real"
                            stroke="#FFFFFF"
                            strokeWidth={3}
                            dot={false}
                            activeDot={false}
                            connectNulls={true}
                            style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.3))" }}
                            animationDuration={1000}
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
                            animationDuration={1000}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default SeasonGoalsChart;
