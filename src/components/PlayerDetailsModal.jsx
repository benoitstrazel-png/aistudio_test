import React, { useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { PLAYERS_DB } from '../data/players_static';
import { getPlayerPhoto } from '../utils/playerPhotos';

// ========== CONSTANTS & DEFINITIONS ==========

const METRIC_DEFINITIONS = {
    // General
    "Appearances": "Nombre total de matchs joués cette saison.",
    "Minutes played": "Temps de jeu total accumulé sur le terrain.",
    "Rating": "Note agrégée basée sur la performance globale (xG + xAG).",
    "Assists": "Dernière passe avant un but.",

    // Gauges
    "Goals": "Nombre total de buts marqués (excluant les tirs au but).",
    "Years": "Âge actuel du joueur au 31 Juillet de la saison en cours.",

    // Advanced
    "Expected Goals (xG)": "Mesure la qualité d'une occasion de but (0 à 1). Indique la probabilité qu'un tir finisse au fond.",
    "Non-Penalty xG": "xG total excluant les pénaltys. Meilleur indicateur de la création d'occasions dans le jeu.",
    "Expected Assists (xAG)": "xG des tirs suivant une passe du joueur. Mesure la qualité de la dernière passe.",
    "Starts": "Nombre de matchs débutés en tant que titulaire.",

    // Performance
    "Efficiency (Goals - xG)": "Différence entre buts réels et attendus. Positif = Finisher efficace / Chanceux.",
    "Direct Contribution (G+A)": "Somme des Buts et des Passes Décisives.",
    "Mins per Match": "Moyenne de minutes jouées par apparition."
};

// ========== SUB-COMPONENTS ==========

// Tooltip Component with React State Control
const InfoTooltip = ({ label }) => {
    const [isVisible, setIsVisible] = React.useState(false);
    const desc = METRIC_DEFINITIONS[label];
    if (!desc) return null;

    return (
        <div
            className="relative ml-1 inline-flex items-center justify-center cursor-help z-50"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            <span className="text-cyan-500/50 hover:text-cyan-400 text-[10px] transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
            </span>
            {/* Tooltip Popup - State Controlled */}
            {isVisible && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 border border-cyan-500/30 rounded shadow-xl text-xs text-slate-300 z-[100] text-center leading-snug pointer-events-none">
                    {desc}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900/90"></div>
                </div>
            )}
        </div>
    );
};


// Circular Gauge Component
const CircularGauge = ({ value, maxValue, label, color = 'cyan', subLabel, size = 160 }) => {
    const percentage = Math.min(100, (value / maxValue) * 100);
    const radius = size * 0.35;
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
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={theme.bg} strokeWidth={strokeWidth} opacity="0.3" />
                <circle
                    cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={theme.stroke} strokeWidth={strokeWidth + 2}
                    strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
                    filter={`url(#glow-${color}-${label})`}
                    style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="font-black tabular-nums" style={{ color: theme.stroke, fontSize: `${size * 0.25}px`, textShadow: `0 0 20px ${theme.glow}`, fontFamily: 'Barlow Condensed, monospace', marginTop: `${size * 0.05}px` }}>
                    {value}
                </div>
                <div className="font-bold uppercase tracking-wide opacity-70 flex items-center pointer-events-auto" style={{ color: theme.stroke, fontSize: `${size * 0.07}px`, fontFamily: 'Barlow Condensed, sans-serif' }}>
                    {label} <InfoTooltip label={label} />
                </div>
                {subLabel && (
                    <div className="font-bold bg-black/40 px-2 py-0.5 rounded-full mt-1" style={{ color: subLabel.includes('+') ? '#4ade80' : (subLabel.includes('-') ? '#f87171' : theme.stroke), fontSize: `${size * 0.06}px`, fontFamily: 'Barlow Condensed, sans-serif' }}>
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
                <span className="text-sm text-cyan-400/70 font-bold uppercase tracking-wide flex items-center" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                    {label} <InfoTooltip label={label} />
                </span>
                <div className="text-right">
                    <span className="text-lg font-bold text-white tabular-nums mr-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>{value}</span>
                    {avgValue !== undefined && (
                        <span className={`text-xs font-bold ${diffColor}`} style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                            ({diffText} vs avg)
                        </span>
                    )}
                </div>
            </div>
            <div className="h-1.5 bg-slate-800/50 rounded-full overflow-hidden relative">
                {avgValue && (
                    <div className="absolute top-0 bottom-0 w-0.5 bg-white/50 z-10" style={{ left: `${Math.min(100, (avgValue / maxValue) * 100)}%` }} />
                )}
                <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${percentage}%`, boxShadow: '0 0 10px rgba(0, 234, 255, 0.6)' }}
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
        diffEl = <span className="text-xs ml-1 opacity-80" style={{ color: diff > 0 ? '#34d399' : '#f87171', fontFamily: 'Barlow Condensed, sans-serif' }}>({diff > 0 ? '+' : ''}{diff})</span>;
    }

    return (
        <div className="flex justify-between items-center py-1.5 border-b border-fuchsia-500/10 last:border-0">
            <span className="text-xs text-fuchsia-400/60 font-bold uppercase tracking-wide flex items-center" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                {label} <InfoTooltip label={label} />
            </span>
            <div className="flex items-center">
                <span className={`text-lg font-bold tabular-nums ${getValueColor()}`} style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
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
        ? { borderColor: '#00eaff', boxShadow: '0 0 15px rgba(0, 234, 255, 0.4), inset 0 0 15px rgba(0, 234, 255, 0.05)' }
        : { borderColor: '#ff00ff', boxShadow: '0 0 15px rgba(255, 0, 255, 0.4), inset 0 0 15px rgba(255, 0, 255, 0.05)' };

    const titleColor = borderColor === 'cyan' ? '#00eaff' : '#ff00ff';

    return (
        <div className={`bg-slate-900/60 backdrop-blur-md border border-opacity-50 rounded-lg p-3 ${className}`}
            style={{
                ...(disableClip ? { overflow: 'visible' } : { clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))' }),
                ...borderStyles
            }}>
            {title && (
                <div className="mb-2 pb-1" style={{ borderBottom: `1px solid ${borderColor === 'cyan' ? '#00eaff30' : '#ff00ff30'}` }}>
                    <h3 className="text-sm font-black uppercase tracking-widest"
                        style={{ color: titleColor, fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.15em', textShadow: `0 0 5px ${borderColor === 'cyan' ? 'rgba(0, 234, 255, 0.8)' : 'rgba(255, 0, 255, 0.8)'}` }}>
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

    const averages = useMemo(() => {
        if (!PLAYERS_DB) return {};
        const peers = PLAYERS_DB.filter(p => p.League === 'fr Ligue 1' && getPosCategory(p.Pos) === posCategory && p.MP > 5);
        if (peers.length === 0) return {};
        const sum = (key) => peers.reduce((acc, curr) => acc + (curr[key] || 0), 0);
        const count = peers.length;
        return {
            Gls: sum('Gls') / count, Age: sum('Age') / count, MP: sum('MP') / count, Min: sum('Min') / count,
            Ast: sum('Ast') / count, xG: sum('xG') / count, npxG: sum('npxG') / count, xAG: sum('xAG') / count,
            Starts: sum('Starts') / count, Rating: peers.reduce((acc, curr) => acc + ((curr.xG || 0) + (curr.xAG || 0)), 0) / count,
            Diff: peers.reduce((acc, curr) => acc + ((curr.Gls || 0) - (curr.xG || 0)), 0) / count,
            Contribution: peers.reduce((acc, curr) => acc + ((curr.Gls || 0) + (curr.Ast || 0)), 0) / count,
            MinsPerMatch: peers.reduce((acc, curr) => acc + (curr.MP > 0 ? curr.Min / curr.MP : 0), 0) / count,
        };
    }, [posCategory]);

    const getDiff = (key, val) => {
        if (!averages[key]) return null;
        const diff = val - averages[key];
        return `${diff > 0 ? '+' : ''}${diff.toFixed(1)} vs Avg`;
    };

    const radarData = useMemo(() => {
        const normalize = (val, max) => Math.min(100, Math.max(0, ((val || 0) / max) * 100));
        let data = [];
        switch (posCategory) {
            case 'FW':
                data = [{ axis: 'Attacking', value: normalize(player.Gls, 20) }, { axis: 'Vision', value: normalize(player.xAG, 10) }, { axis: 'Passing', value: normalize(player.Ast, 15) }, { axis: 'Efficiency', value: normalize((player.Gls || 0) / (player.xG || 1) * 10, 15) }, { axis: 'Activity', value: normalize(player.MP, 34) }]; break;
            case 'MF':
                data = [{ axis: 'Passing', value: normalize(player.Ast, 15) }, { axis: 'Vision', value: normalize(player.xAG, 10) }, { axis: 'Attacking', value: normalize(player.Gls, 10) }, { axis: 'Activity', value: normalize(player.MP, 34) }, { axis: 'Engagement', value: normalize(player.Starts, 34) }]; break;
            case 'DF':
                data = [{ axis: 'Stamina', value: normalize(player.Min, 3060) }, { axis: 'Engagement', value: normalize(player.Starts, 34) }, { axis: 'Activity', value: normalize(player.MP, 34) }, { axis: 'Passing', value: normalize(player.Ast, 5) }, { axis: 'Attacking', value: normalize(player.Gls, 5) }]; break;
            case 'GK':
                data = [{ axis: 'Stamina', value: normalize(player.Min, 3060) }, { axis: 'Engagement', value: normalize(player.Starts, 34) }, { axis: 'Clean Sheets', value: normalize(player.CleanSheets, 15) }, { axis: 'Passing', value: normalize(player.Ast, 1) }, { axis: 'Defense', value: player.GoalsConceded !== undefined ? normalize(50 - (player.ConcededPer90 * 10), 50) : 50 }]; break;
            default: data = [];
        }
        return data;
    }, [player, posCategory]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300" onClick={onClose}>
            <style jsx>{`
                @keyframes popIn { 0% { opacity: 0; transform: scale(0.95) translateY(10px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
                .animate-pop-in { animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>

            <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden animate-pop-in flex flex-col max-h-[95vh]" onClick={e => e.stopPropagation()} style={{ boxShadow: '0 0 50px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.1)' }}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-3 bg-slate-800/50 border-b border-slate-700/50 backdrop-blur-md sticky top-0 z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.6)]"></div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-wider" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>Analysis Protocole</h2>
                            <p className="text-[10px] text-cyan-400 font-mono tracking-widest">Target: {player.Player}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-800 border border-slate-600 text-slate-400 hover:bg-rose-500/20 hover:border-rose-500 hover:text-rose-400 transition-all duration-200">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto p-4 space-y-3">
                    {/* ZONE 1: GENERAL STATS */}
                    <HUDCard title="LEAGUE STATISTICS" borderColor="cyan">
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-4">
                                {/* Photo Container - Resized with inline styles */}
                                <div
                                    className="rounded-full border border-cyan-500/50 bg-slate-800 overflow-hidden shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                                    style={{ width: '300px', height: '300px' }}
                                >
                                    {getPlayerPhoto(player.Squad, player.Player) ? (
                                        <img
                                            src={getPlayerPhoto(player.Squad, player.Player)}
                                            alt={player.Player}
                                            className="w-full h-full"
                                            style={{ objectFit: 'cover', objectPosition: 'top' }}
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-cyan-500/30">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-cyan-400" style={{ fontFamily: 'Barlow Condensed, sans-serif', textShadow: '0 0 15px rgba(0, 234, 255, 0.4)' }}>{player.Player}</h2>
                                    <div className="flex gap-2">
                                        <span className="px-2 py-0.5 bg-cyan-900/40 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold rounded uppercase">{player.Pos}</span>
                                        <span className="text-xs text-slate-400">{player.Squad}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <ProgressBar label="Appearances" value={player.MP} maxValue={34} avgValue={averages.MP} />
                            <ProgressBar label="Minutes played" value={player.Min} maxValue={3060} avgValue={averages.Min} />
                            <ProgressBar label="Rating" value={parseFloat(((player.xG || 0) + (player.xAG || 0)).toFixed(1))} maxValue={20} avgValue={averages.Rating} />
                            <ProgressBar label="Assists" value={player.Ast} maxValue={15} avgValue={averages.Ast} />
                        </div>
                    </HUDCard>

                    {/* ZONE 2: KEY INDICATORS ROW (4 cols) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* 1. OFFENSIVE GAUGE */}
                        <HUDCard title="OFFENSIVE" borderColor="cyan" disableClip={true} className="flex flex-col items-center justify-center p-2 bg-slate-800/20">
                            <CircularGauge value={player.Gls} maxValue={25} label="Goals" subLabel={getDiff('Gls', player.Gls)} color="cyan" size={120} />
                        </HUDCard>

                        {/* 2. AGE GAUGE */}
                        <HUDCard title="AGE" borderColor="magenta" disableClip={true} className="flex flex-col items-center justify-center p-2 bg-slate-800/20">
                            <CircularGauge value={player.Age} maxValue={40} label="Years" subLabel={getDiff('Age', player.Age)} color="magenta" size={120} />
                        </HUDCard>

                        {/* 3. ADVANCED METRICS */}
                        <HUDCard title="ADVANCED METRICS" borderColor="magenta" disableClip={true} className="flex flex-col justify-center">
                            <div className="space-y-1">
                                <StatRow label="Expected Goals (xG)" value={player.xG || 0} avgValue={averages.xG} />
                                <StatRow label="Non-Penalty xG" value={player.npxG || 0} avgValue={averages.npxG} />
                                <StatRow label="Expected Assists (xAG)" value={player.xAG || 0} avgValue={averages.xAG} />
                                <StatRow label="Starts" value={player.Starts} avgValue={averages.Starts} />
                            </div>
                        </HUDCard>

                        {/* 4. PERFORMANCE METRICS */}
                        <HUDCard title="PERFORMANCE EFFICIENCY" borderColor="magenta" disableClip={true} className="flex flex-col justify-center">
                            <div className="space-y-1">
                                <StatRow label="Efficiency (Goals - xG)" value={(player.Gls || 0) - (player.xG || 0)} avgValue={averages.Diff} highlight />
                                <StatRow label="Direct Contribution (G+A)" value={(player.Gls || 0) + (player.Ast || 0)} avgValue={averages.Contribution} />
                                <StatRow label="Mins per Match" value={player.MP > 0 ? Math.round(player.Min / player.MP) : 0} avgValue={averages.MinsPerMatch} />
                            </div>
                        </HUDCard>
                    </div>

                    {/* ZONE 3: RADAR CHART (Full Width) */}
                    <div className="w-full">
                        <HUDCard className="bg-slate-900/40 relative" disableClip={true} borderColor="cyan">
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-1/2 h-full rounded-full blur-[80px] bg-cyan-500/10" /></div>
                            <div className="w-full h-[320px]">
                                <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                                        <defs>
                                            <linearGradient id="radarFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00eaff" stopOpacity={0.8} /><stop offset="100%" stopColor="#ff00ff" stopOpacity={0.4} /></linearGradient>
                                            <filter id="radarGlow"><feGaussianBlur stdDeviation="4" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                                        </defs>
                                        <PolarGrid stroke="#00eaff" strokeWidth={1} strokeOpacity={0.4} />
                                        <PolarAngleAxis dataKey="axis" tick={{ fill: '#00eaff', fontSize: 12, fontWeight: 700, fontFamily: 'Barlow Condensed, sans-serif' }} tickLine={false} />
                                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                                        <Radar dataKey="value" stroke="#00eaff" strokeWidth={3} fill="url(#radarFill)" fillOpacity={0.5} filter="url(#radarGlow)" />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </HUDCard>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerDetailsModal;
