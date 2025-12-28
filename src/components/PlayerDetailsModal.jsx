import React, { useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

// ========== SUB-COMPONENTS ==========

// Circular Gauge Component (SVG-based)
const CircularGauge = ({ value, maxValue, label, color = 'cyan' }) => {
    const percentage = Math.min(100, (value / maxValue) * 100);
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const colors = {
        cyan: { stroke: '#00eaff', bg: '#005F9E', glow: 'rgba(0, 234, 255, 0.5)' },
        magenta: { stroke: '#ff00ff', bg: '#660066', glow: 'rgba(255, 0, 255, 0.5)' }
    };

    const theme = colors[color];

    return (
        <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
            <svg className="transform -rotate-90" width="200" height="200">
                <defs>
                    <filter id={`glow-${color}-${label}`}>
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                {/* Background circle */}
                <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="none"
                    stroke={theme.bg}
                    strokeWidth="10"
                    opacity="0.3"
                />
                {/* Progress circle */}
                <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="none"
                    stroke={theme.stroke}
                    strokeWidth="12"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    filter={`url(#glow-${color}-${label})`}
                    style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div
                    className="text-5xl font-black tabular-nums"
                    style={{
                        color: theme.stroke,
                        textShadow: `0 0 20px ${theme.glow}`,
                        fontFamily: 'Barlow Condensed, monospace'
                    }}
                >
                    {value}
                </div>
                <div className="text-xs mt-1 opacity-70" style={{ color: theme.stroke }}>
                    {label}
                </div>
            </div>
        </div>
    );
};

// Horizontal Progress Bar
const ProgressBar = ({ label, value, maxValue }) => {
    const percentage = Math.min(100, (value / maxValue) * 100);

    return (
        <div className="space-y-1">
            <div className="flex justify-between items-center">
                <span className="text-xs text-cyan-400/70 font-medium">{label}</span>
                <span className="text-sm font-bold text-white tabular-nums">{value}</span>
            </div>
            <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-full transition-all duration-700 ease-out"
                    style={{
                        width: `${percentage}%`,
                        boxShadow: '0 0 10px rgba(0, 234, 255, 0.6)'
                    }}
                />
            </div>
        </div>
    );
};

// Stat Row Component (for bottom sections)
const StatRow = ({ label, value, highlight = false }) => {
    const getValueColor = () => {
        if (typeof value === 'number' && highlight) {
            return value > 0 ? 'text-emerald-400' : 'text-rose-400';
        }
        return 'text-white';
    };

    return (
        <div className="flex justify-between items-center py-2 border-b border-fuchsia-500/10 last:border-0">
            <span className="text-xs text-fuchsia-400/60">{label}</span>
            <span className={`text-lg font-bold tabular-nums ${getValueColor()}`}>
                {typeof value === 'number' ? value.toFixed(1) : value}
            </span>
        </div>
    );
};

// HUD Card Component
const HUDCard = ({ children, title, className = '', borderColor = 'cyan', disableClip = false }) => {
    const borderStyles = borderColor === 'cyan'
        ? {
            borderColor: '#00eaff',
            boxShadow: '0 0 20px rgba(0, 234, 255, 0.6), 0 0 40px rgba(0, 234, 255, 0.3), inset 0 0 20px rgba(0, 234, 255, 0.1)'
        }
        : {
            borderColor: '#ff00ff',
            boxShadow: '0 0 20px rgba(255, 0, 255, 0.6), 0 0 40px rgba(255, 0, 255, 0.3), inset 0 0 20px rgba(255, 0, 255, 0.1)'
        };

    const titleColor = borderColor === 'cyan' ? '#00eaff' : '#ff00ff';

    return (
        <div className={`bg-slate-900/60 backdrop-blur-md border-2 rounded-lg p-4 ${className}`}
            style={{
                ...(disableClip ? { overflow: 'visible' } : { clipPath: 'polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px))' }),
                ...borderStyles
            }}>
            {title && (
                <div className="mb-3 pb-2" style={{ borderBottom: `1px solid ${borderColor === 'cyan' ? '#00eaff40' : '#ff00ff40'}` }}>
                    <h3 className="text-sm font-black uppercase tracking-widest"
                        style={{
                            color: titleColor,
                            fontFamily: 'Barlow Condensed, sans-serif',
                            letterSpacing: '0.15em',
                            textShadow: `0 0 10px ${borderColor === 'cyan' ? 'rgba(0, 234, 255, 0.8)' : 'rgba(255, 0, 255, 0.8)'}`
                        }}>
                        {title}
                    </h3>
                </div>
            )}
            {children}
        </div>
    );
};

// ========== MAIN COMPONENT ==========

const PlayerDetailsModal = ({ player, onClose }) => {
    if (!player) return null;

    const getPosCategory = (pos) => {
        if (!pos) return 'MF';
        if (pos.includes('GK')) return 'GK';
        if (pos.includes('DF')) return 'DF';
        if (pos.includes('FW')) return 'FW';
        return 'MF';
    };

    const posCategory = getPosCategory(player.Pos);

    // Radar Chart Data
    const radarData = useMemo(() => {
        const normalize = (val, max) => Math.min(100, Math.max(0, ((val || 0) / max) * 100));

        switch (posCategory) {
            case 'FW':
                return [
                    { axis: 'Attacking', value: normalize(player.Gls, 20) },
                    { axis: 'Vision', value: normalize(player.xAG, 10) },
                    { axis: 'Passing', value: normalize(player.Ast, 15) },
                    { axis: 'Efficiency', value: normalize((player.Gls || 0) / (player.xG || 1) * 10, 15) },
                    { axis: 'Activity', value: normalize(player.MP, 34) },
                ];
            case 'MF':
                return [
                    { axis: 'Passing', value: normalize(player.Ast, 15) },
                    { axis: 'Vision', value: normalize(player.xAG, 10) },
                    { axis: 'Attacking', value: normalize(player.Gls, 10) },
                    { axis: 'Activity', value: normalize(player.MP, 34) },
                    { axis: 'Engagement', value: normalize(player.Starts, 34) },
                ];
            case 'DF':
                return [
                    { axis: 'Stamina', value: normalize(player.Min, 3060) },
                    { axis: 'Engagement', value: normalize(player.Starts, 34) },
                    { axis: 'Activity', value: normalize(player.MP, 34) },
                    { axis: 'Passing', value: normalize(player.Ast, 5) },
                    { axis: 'Attacking', value: normalize(player.Gls, 5) },
                ];
            case 'GK':
                return [
                    { axis: 'Stamina', value: normalize(player.Min, 3060) },
                    { axis: 'Engagement', value: normalize(player.Starts, 34) },
                    { axis: 'Clean Sheets', value: normalize(player.CleanSheets, 15) },
                    { axis: 'Passing', value: normalize(player.Ast, 1) },
                    { axis: 'Defense', value: player.GoalsConceded !== undefined ? normalize(50 - (player.ConcededPer90 * 10), 50) : 50 },
                ];
            default:
                return [];
        }
    }, [player, posCategory]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/20 backdrop-blur-md"
            onClick={onClose}
        >
            {/* Circuit Grid Background */}
            <div
                className="absolute inset-0 opacity-10"
                style={{
                    backgroundImage: 'linear-gradient(rgba(0, 234, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 234, 255, 0.1) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}
            />

            <div className="relative w-full max-w-6xl" onClick={e => e.stopPropagation()}>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute -top-12 left-0 w-10 h-10 rounded-full flex items-center justify-center 
                               bg-cyan-500/20 border-2 border-cyan-500 text-cyan-400 
                               hover:bg-cyan-500/30 transition-all duration-200
                               shadow-[0_0_20px_rgba(0,234,255,0.4)]"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                {/* MAIN LAYOUT - 3 Zones Verticales */}
                <div className="flex flex-col gap-3">

                    {/* ========== ZONE 1: HEADER & GENERAL ========== */}
                    <HUDCard title="LEAGUE" borderColor="cyan">
                        <div className="mb-4">
                            <h2 className="text-4xl font-black text-cyan-400 mb-1"
                                style={{
                                    fontFamily: 'Barlow Condensed, sans-serif',
                                    textShadow: '0 0 15px rgba(0, 234, 255, 0.8)'
                                }}>
                                {player.Player}
                            </h2>
                            <p className="text-sm text-cyan-400/70">
                                <span className="font-semibold">{player.Pos}</span> • {player.Squad} • Ligue 1
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <ProgressBar label="Appearances" value={player.MP} maxValue={34} />
                            <ProgressBar label="Minutes played" value={player.Min} maxValue={3060} />
                            <ProgressBar label="Rating" value={parseFloat(((player.xG || 0) + (player.xAG || 0)).toFixed(1))} maxValue={20} />
                            <ProgressBar label="Assists" value={player.Ast} maxValue={15} />
                        </div>
                    </HUDCard>

                    {/* ========== ZONE 2: MIDDLE (Grid 3 colonnes) ========== */}
                    <div className="grid grid-cols-12 gap-3">

                        {/* LEFT - OFFENSIVE */}
                        <div className="col-span-3">
                            <HUDCard title="OFFENSIVE" borderColor="cyan" disableClip={true} className="h-full flex flex-col items-center justify-center py-8">
                                <CircularGauge
                                    value={player.Gls}
                                    maxValue={25}
                                    label={`Goals (${player.MP > 0 ? Math.round((player.Gls / player.MP) * 100) : 0}%)`}
                                    color="cyan"
                                />
                            </HUDCard>
                        </div>

                        {/* CENTER - RADAR */}
                        <div className="col-span-6">
                            <div className="relative h-full flex flex-col items-center justify-center">
                                {/* Glow effect */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-64 h-64 rounded-full blur-3xl bg-cyan-500/20" />
                                </div>

                                <div className="relative w-full" style={{ height: 400 }}>
                                    <ResponsiveContainer>
                                        <RadarChart data={radarData}>
                                            <defs>
                                                <linearGradient id="radarFill" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#00eaff" stopOpacity={0.8} />
                                                    <stop offset="100%" stopColor="#ff00ff" stopOpacity={0.4} />
                                                </linearGradient>
                                                <filter id="radarGlow">
                                                    <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                                                    <feMerge>
                                                        <feMergeNode in="coloredBlur" />
                                                        <feMergeNode in="SourceGraphic" />
                                                    </feMerge>
                                                </filter>
                                            </defs>
                                            <PolarGrid stroke="#00eaff" strokeWidth={2} strokeOpacity={0.6} />
                                            <PolarAngleAxis
                                                dataKey="axis"
                                                tick={{
                                                    fill: '#00eaff',
                                                    fontSize: 13,
                                                    fontWeight: 900,
                                                    fontFamily: 'Barlow Condensed, sans-serif'
                                                }}
                                                tickLine={false}
                                            />
                                            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                                            <Radar
                                                dataKey="value"
                                                stroke="#00eaff"
                                                strokeWidth={4}
                                                fill="url(#radarFill)"
                                                fillOpacity={0.7}
                                                filter="url(#radarGlow)"
                                            />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT - AGE */}
                        <div className="col-span-3">
                            <HUDCard title="AGE" borderColor="magenta" disableClip={true} className="h-full flex flex-col items-center justify-center py-8">
                                <CircularGauge
                                    value={player.Age}
                                    maxValue={40}
                                    label="Years"
                                    color="magenta"
                                />
                            </HUDCard>
                        </div>
                    </div>

                    {/* ========== ZONE 3: BOTTOM (Grid 2 colonnes) ========== */}
                    <div className="grid grid-cols-2 gap-3">

                        {/* LEFT - ADVANCED */}
                        <HUDCard title="ADVANCED" borderColor="magenta">
                            <div className="space-y-1">
                                <StatRow label="Expected Goals (xG)" value={player.xG || 0} />
                                <StatRow label="Non-Penalty xG" value={player.npxG || 0} />
                                <StatRow label="Expected Assists (xAG)" value={player.xAG || 0} />
                                <StatRow label="Starts" value={player.Starts} />
                            </div>
                        </HUDCard>

                        {/* RIGHT - PERFORMANCE */}
                        <HUDCard title="PERFORMANCE" borderColor="magenta">
                            <div className="space-y-1">
                                <StatRow label="Goals - xG" value={(player.Gls || 0) - (player.xG || 0)} highlight />
                                <StatRow label="Goals + Assists" value={(player.Gls || 0) + (player.Ast || 0)} />
                                <StatRow label="Avg Minutes/Match" value={player.MP > 0 ? Math.round(player.Min / player.MP) : 0} />
                            </div>
                        </HUDCard>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerDetailsModal;
