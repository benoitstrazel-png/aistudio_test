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

        // Helper: Logic to get consistent score from prediction (mirrors LeagueCalendar)
        const getProjectedGoalsForMatch = (match) => {
            if (!match.prediction?.score) return 2.5; // Fallback average if no prediction

            const scoreParts = match.prediction.score.split('-');
            let h = parseInt(scoreParts[0]);
            let a = parseInt(scoreParts[1]);

            if (isNaN(h) || isNaN(a)) return 2.5;

            // Apply consistency logic (force winner / goals)
            const winnerDisplay = match.prediction.winner;
            const winnerConf = match.prediction.winner_conf || 0;
            const goalsPred = match.prediction.goals_pred || "";

            // 1. Force Winner Consistency
            // Allow Draws if confidence is low (< 45%) and original score was a draw
            const originalIsDraw = h === a;
            const isWeakPrediction = winnerConf < 45;

            let forceWinner = true;
            if (originalIsDraw && isWeakPrediction && (winnerDisplay === 'Draw' || winnerDisplay === 'Nul' || winnerDisplay === match.homeTeam || winnerDisplay === match.awayTeam)) {
                // Logic mirrors Calendar: "We accept the draw" if weak pred
                // Note: Calendar forces winner unless (originalIsDraw && isWeakPrediction)
                // If winner is explicit e.g. "Lens", but weak, and score is 1-1, keep 1-1.
                forceWinner = false;
            }

            if (forceWinner) {
                if (winnerDisplay === match.homeTeam && h <= a) h = a + 1;
                else if (winnerDisplay === match.awayTeam && a <= h) a = h + 1;
                else if ((winnerDisplay === "Nul" || winnerDisplay === "Draw") && h !== a) { const m = Math.max(h, a); h = m; a = m; }
            }

            // 2. Force Goals Consistency
            const isOver2_5 = goalsPred.includes('+2.5');
            const isUnder2_5 = goalsPred.includes('-2.5');

            if (isUnder2_5 && (h + a) > 2) {
                if (winnerDisplay === match.homeTeam) { h = 1; a = 0; }
                else if (winnerDisplay === match.awayTeam) { h = 0; a = 1; }
                else { h = 1; a = 1; }
            } else if (isOver2_5 && (h + a) < 3) {
                if (winnerDisplay === match.homeTeam) { h = 2; a = 1; }
                else if (winnerDisplay === match.awayTeam) { h = 1; a = 2; }
                else { h = 2; a = 2; }
            }

            return h + a;
        };

        let lastRealParams = null; // To track where to start projection line

        for (let w = 1; w <= TOTAL_WEEKS; w++) {
            const matches = schedule.filter(m => m.week === w);
            if (matches.length === 0) continue;

            // Determine status of the week
            const finishedMatches = matches.filter(m => m.status === 'FINISHED').length;
            const isFinishedWeek = finishedMatches > (matches.length / 2); // Mostly finished

            if (isFinishedWeek) {
                // REAL DATA
                const weekGoals = matches.reduce((acc, m) => {
                    const h = m.score?.home ?? 0;
                    const a = m.score?.away ?? 0;
                    return acc + h + a;
                }, 0);

                processedData.push({
                    name: `J${w}`,
                    real: weekGoals,
                    projected: null,
                });
                lastRealParams = { week: w, val: weekGoals };
            } else {
                // PROJECTED DATA
                const weekGoals = matches.reduce((acc, m) => acc + getProjectedGoalsForMatch(m), 0);

                // Add dot if first projected week
                const isTransition = lastRealParams && lastRealParams.week === (w - 1);

                // If transition, we might want to connect the line? 
                // Recharts connects nulls if connectNulls={true}, but we usually want visual continuity.
                // If we want the projection line to start FROM the last real point, we'd need a shared point.
                // But usually split lines are fine. 

                processedData.push({
                    name: `J${w}`,
                    real: null,
                    projected: Math.round(weekGoals), // Integer goals
                    isTransition: isTransition
                });
            }
        }

        return processedData;
    }, [schedule]);


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
