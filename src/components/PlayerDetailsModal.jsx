import React, { useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { PLAYERS_DB } from '../data/players_static';

// ========== SUB-COMPONENTS ==========

// Circular Gauge Component (SVG-based)
const CircularGauge = ({ value, maxValue, label, color = 'cyan', subLabel, size = 160 }) => {
    const percentage = Math.min(100, (value / maxValue) * 100);
    const radius = size * 0.35; // Dynamically calculate radius based on size
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    const strokeWidth = size * 0.08;

    const colors = {
        cyan: { stroke: '#00eaff', bg: '#005F9E', glow: 'rgba(0, 234, 255, 0.5)' },
        magenta: { stroke: '#ff00ff', bg: '#660066', glow: 'rgba(255, 0, 255, 0.5)' }
    };

    const theme = colors[color];

    return (
        <div className="relative flex items-center justify-center dashed-border" style={{ width: size, height: size }}>
            <svg className="transform -rotate-90" width={size} height={size}>
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
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={theme.bg}
                    strokeWidth={strokeWidth}
                    opacity="0.3"
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={theme.stroke}
                    strokeWidth={strokeWidth + 2}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    filter={`url(#glow-${color}-${label})`}
                    style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div
                    className="font-black tabular-nums"
                    style={{
                        color: theme.stroke,
                        // Responsive font size based on component size
                        fontSize: `${size * 0.25}px`,
                        textShadow: `0 0 20px ${theme.glow}`,
                        fontFamily: 'Barlow Condensed, monospace',
                        marginTop: `${size * 0.05}px`
                    }}
                >
                    {value}
                </div>
                <div
                    className="font-bold uppercase tracking-wide opacity-70"
                    style={{
                        color: theme.stroke,
                        fontSize: `${size * 0.07}px`
                    }}
                >
                    {label}
                </div>
                {subLabel && (
                    <div
                        className="font-bold bg-black/40 px-2 py-0.5 rounded-full mt-1"
                        style={{
                            color: subLabel.includes('+') ? '#4ade80' : (subLabel.includes('-') ? '#f87171' : theme.stroke),
                            fontSize: `${size * 0.06}px`
                        }}
                    >
                        {subLabel}
                    </div>
                )}
            </div>
        </div>
    );
};

// Horizontal Progress Bar
const ProgressBar = ({ label, value, maxValue, avgValue }) => {
    const percentage = Math.min(100, (value / maxValue) * 100);
    const diff = avgValue !== undefined ? (value - avgValue).toFixed(1) : null;
    const diffColor = diff > 0 ? 'text-emerald-400' : (diff < 0 ? 'text-rose-400' : 'text-slate-400');
    const diffText = diff > 0 ? `+${diff}` : diff;

    return (
        <div className="space-y-1">
            <div className="flex justify-between items-end">
                <span className="text-xs text-cyan-400/70 font-medium">{label}</span>
                <div className="text-right">
                    <span className="text-sm font-bold text-white tabular-nums mr-2">{value}</span>
                    {avgValue !== undefined && (
                        <span className={`text-[10px] ${diffColor}`}>
                            ({diffText} vs avg)
                        </span>
                    )}
                </div>
            </div>
            <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden relative">
                {/* Avg Marker */}
                {avgValue && (
                    <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white/50 z-10"
                        style={{ left: `${Math.min(100, (avgValue / maxValue) * 100)}%` }}
                    />
                )}
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

// Stat Row Component
const StatRow = ({ label, value, avgValue, highlight = false }) => {
    const getValueColor = () => {
        if (typeof value === 'number' && highlight) {
            return value > 0 ? 'text-emerald-400' : 'text-rose-400';
        }
        return 'text-white';
    };

    let diffEl = null;
    if (avgValue !== undefined && typeof value === 'number') {
        const diff = (value - avgValue).toFixed(1);
        const color = diff > 0 ? 'text-emerald-400' : (diff < 0 ? 'text-rose-400' : 'text-slate-500');
        diffEl = <span className={`text-[10px] ml-2 ${color}`}>({diff > 0 ? '+' : ''}{diff})</span>;
    }

    return (
        <div className="flex justify-between items-center py-2 border-b border-fuchsia-500/10 last:border-0">
            <span className="text-xs text-fuchsia-400/60">{label}</span>
            <div className="flex items-center">
                <span className={`text-lg font-bold tabular-nums ${getValueColor()}`}>
                    {typeof value === 'number' ? value.toFixed(1) : value}
                </span>
                {diffEl}
            </div>
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

    // Calculate Averages for Comparison
    const averages = useMemo(() => {
        if (!PLAYERS_DB) return {};

        // Filter by Same Position (Broadly) & League
        const peers = PLAYERS_DB.filter(p =>
            p.League === 'fr Ligue 1' &&
            getPosCategory(p.Pos) === posCategory &&
            p.MP > 5 // Minimum minutes to be relevant
        );

        if (peers.length === 0) return {};

        const sum = (key) => peers.reduce((acc, curr) => acc + (curr[key] || 0), 0);
        const count = peers.length;

        return {
            Gls: sum('Gls') / count,
            Age: sum('Age') / count,
            MP: sum('MP') / count,
            Min: sum('Min') / count,
            Ast: sum('Ast') / count,
            xG: sum('xG') / count,
            npxG: sum('npxG') / count,
            xAG: sum('xAG') / count,
            Starts: sum('Starts') / count,
            Rating: peers.reduce((acc, curr) => acc + ((curr.xG || 0) + (curr.xAG || 0)), 0) / count,
            Diff: peers.reduce((acc, curr) => acc + ((curr.Gls || 0) - (curr.xG || 0)), 0) / count,
            Contribution: peers.reduce((acc, curr) => acc + ((curr.Gls || 0) + (curr.Ast || 0)), 0) / count,
            MinsPerMatch: peers.reduce((acc, curr) => acc + (curr.MP > 0 ? curr.Min / curr.MP : 0), 0) / count,
        };
    }, [posCategory]);

    // Simple diff formatter
    const getDiff = (key, val) => {
        if (!averages[key]) return null;
        const diff = val - averages[key];
        return `${diff > 0 ? '+' : ''}${diff.toFixed(1)} vs Avg`;
    };

    // Radar Chart Data
    const radarData = useMemo(() => {
        const normalize = (val, max) => Math.min(100, Math.max(0, ((val || 0) / max) * 100));

        let data = [];
        switch (posCategory) {
            case 'FW':
                data = [
                    { axis: 'Attacking', value: normalize(player.Gls, 20) },
                    { axis: 'Vision', value: normalize(player.xAG, 10) },
                    { axis: 'Passing', value: normalize(player.Ast, 15) },
                    { axis: 'Efficiency', value: normalize((player.Gls || 0) / (player.xG || 1) * 10, 15) },
                    { axis: 'Activity', value: normalize(player.MP, 34) },
                ];
                break;
            case 'MF':
                data = [
                    { axis: 'Passing', value: normalize(player.Ast, 15) },
                    { axis: 'Vision', value: normalize(player.xAG, 10) },
                    { axis: 'Attacking', value: normalize(player.Gls, 10) },
                    { axis: 'Activity', value: normalize(player.MP, 34) },
                    { axis: 'Engagement', value: normalize(player.Starts, 34) },
                ];
                break;
            case 'DF':
                data = [
                    { axis: 'Stamina', value: normalize(player.Min, 3060) },
                    { axis: 'Engagement', value: normalize(player.Starts, 34) },
                    { axis: 'Activity', value: normalize(player.MP, 34) },
                    { axis: 'Passing', value: normalize(player.Ast, 5) },
                    { axis: 'Attacking', value: normalize(player.Gls, 5) },
                ];
                break;
            case 'GK':
                data = [
                    { axis: 'Stamina', value: normalize(player.Min, 3060) },
                    { axis: 'Engagement', value: normalize(player.Starts, 34) },
                    { axis: 'Clean Sheets', value: normalize(player.CleanSheets, 15) },
                    { axis: 'Passing', value: normalize(player.Ast, 1) },
                    { axis: 'Defense', value: player.GoalsConceded !== undefined ? normalize(50 - (player.ConcededPer90 * 10), 50) : 50 },
                ];
                break;
            default:
                data = [];
        }
        return data;
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

            <div className="relative w-full max-w-6xl overflow-y-auto max-h-[90vh] pb-10" onClick={e => e.stopPropagation()}>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute -top-4 right-0 md:-top-12 md:right-0 w-10 h-10 rounded-full flex items-center justify-center 
                               bg-cyan-500/20 border-2 border-cyan-500 text-cyan-400 
                               hover:bg-cyan-500/30 transition-all duration-200
                               shadow-[0_0_20px_rgba(0,234,255,0.4)] z-50"
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
                        <div className="mb-4 text-center md:text-left">
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

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <ProgressBar label="Appearances" value={player.MP} maxValue={34} avgValue={averages.MP} />
                            <ProgressBar label="Minutes played" value={player.Min} maxValue={3060} avgValue={averages.Min} />
                            <ProgressBar label="Rating" value={parseFloat(((player.xG || 0) + (player.xAG || 0)).toFixed(1))} maxValue={20} avgValue={averages.Rating} />
                            <ProgressBar label="Assists" value={player.Ast} maxValue={15} avgValue={averages.Ast} />
                        </div>
                    </HUDCard>

                    {/* ========== ZONE 2: VISUALS (Gauges Up + Radar Down) ========== */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">

                        {/* LEFT COLUMN: GAUGES stacked or side-by-side depending on need
                            Here: "Cote à cote au dessus du radar" suggests dividing the space.
                            Let's maximize space by putting gauges in a row above radar.
                        */}

                        <div className="col-span-1 md:col-span-12 grid grid-cols-2 gap-3">
                            {/* OFFENSIVE GAUGE */}
                            <HUDCard title="OFFENSIVE" borderColor="cyan" disableClip={true} className="flex flex-col items-center justify-center p-4">
                                <CircularGauge
                                    value={player.Gls}
                                    maxValue={25}
                                    label={`Goals`}
                                    subLabel={getDiff('Gls', player.Gls)}
                                    color="cyan"
                                    size={160} // Compact Size
                                />
                            </HUDCard>

                            {/* AGE GAUGE */}
                            <HUDCard title="AGE" borderColor="magenta" disableClip={true} className="flex flex-col items-center justify-center p-4">
                                <CircularGauge
                                    value={player.Age}
                                    maxValue={40}
                                    label="Years"
                                    subLabel={getDiff('Age', player.Age)}
                                    color="magenta"
                                    size={160} // Compact Size
                                />
                            </HUDCard>
                        </div>

                        {/* RADAR CHART - Full Width Below Gauges */}
                        <div className="col-span-1 md:col-span-12">
                            <HUDCard className="h-full bg-slate-900/40 relative" disableClip={true} borderColor="cyan">
                                {/* Glow effect */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-64 h-64 rounded-full blur-3xl bg-cyan-500/20" />
                                </div>

                                <div className="w-full h-[350px]">
                                    <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                                        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
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
                            </HUDCard>
                        </div>
                    </div>

                    {/* ========== ZONE 3: BOTTOM (Grid 2 colonnes) ========== */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                        {/* LEFT - ADVANCED */}
                        <HUDCard title="ADVANCED METRICS" borderColor="magenta">
                            <div className="space-y-2">
                                <StatRow label="Expected Goals (xG)" value={player.xG || 0} avgValue={averages.xG} />
                                <StatRow label="Non-Penalty xG" value={player.npxG || 0} avgValue={averages.npxG} />
                                <StatRow label="Expected Assists (xAG)" value={player.xAG || 0} avgValue={averages.xAG} />
                                <StatRow label="Starts" value={player.Starts} avgValue={averages.Starts} />
                            </div>
                        </HUDCard>

                        {/* RIGHT - PERFORMANCE */}
                        <HUDCard title="PERFORMANCE EFFICIENCY" borderColor="magenta">
                            <div className="space-y-2">
                                <StatRow label="Efficiency (Goals - xG)" value={(player.Gls || 0) - (player.xG || 0)} avgValue={averages.Diff} highlight />
                                <StatRow label="Direct Contribution (G+A)" value={(player.Gls || 0) + (player.Ast || 0)} avgValue={averages.Contribution} />
                                <StatRow label="Mins per Match" value={player.MP > 0 ? Math.round(player.Min / player.MP) : 0} avgValue={averages.MinsPerMatch} />
                            </div>
                        </HUDCard>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerDetailsModal;
