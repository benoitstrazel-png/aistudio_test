import React from 'react';
import SeasonGoalsChart from './SeasonGoalsChart';
import InfoTooltip from './ui/InfoTooltip';

const DashboardStats = ({ stats, schedule, currentWeek, teamStats }) => {
    return (
        <div className="flex flex-col gap-12">
            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Card 1 */}
                <div className="flex flex-col items-center gap-4 h-full">
                    <div className="flex flex-col items-center gap-1 z-10 h-12 justify-end">
                        <h3 className="text-secondary text-xs font-bold uppercase tracking-widest text-center shadow-black drop-shadow-md">Buts Total Saison</h3>
                        <InfoTooltip text="Somme des buts marqués par toutes les équipes depuis le début de la saison." className="ml-0" />
                    </div>
                    <div className="glass-card relative overflow-hidden group w-full h-full flex flex-col items-center justify-center py-8">
                        <div className="absolute -right-4 -top-4 bg-accent/10 w-24 h-24 rounded-full blur-2xl group-hover:bg-accent/20 transition-all"></div>
                        <div className="flex flex-col items-center gap-1 z-0">
                            <p className="text-white text-5xl font-black tracking-tighter filter drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{stats.totalGoals}</p>
                            <span className="text-accent text-sm font-bold bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">+12%</span>
                        </div>
                    </div>
                </div>

                {/* Card 2 */}
                <div className="flex flex-col items-center gap-4 h-full">
                    <div className="flex flex-col items-center gap-1 z-10 h-12 justify-end">
                        <h3 className="text-secondary text-xs font-bold uppercase tracking-widest text-center shadow-black drop-shadow-md">Moyenne Buts/Journée</h3>
                        <InfoTooltip text="Moyenne des buts marqués par journée de championnat." className="ml-0" />
                    </div>
                    <div className="glass-card relative overflow-hidden group w-full h-full flex flex-col items-center justify-center py-8">
                        <div className="absolute -right-4 -top-4 bg-blue-500/10 w-24 h-24 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
                        <div className="flex flex-col items-center gap-1 z-0">
                            <p className="text-white text-5xl font-black tracking-tighter filter drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]">{stats.goalsPerDay}</p>
                            <span className="text-blue-400 text-sm font-bold bg-blue-400/10 px-2 py-0.5 rounded-full border border-blue-400/20">Stable</span>
                        </div>
                    </div>
                </div>

                {/* Card 3 */}
                <div className="flex flex-col items-center gap-4 h-full">
                    <div className="flex flex-col items-center gap-1 z-10 h-12 justify-end">
                        <h3 className="text-secondary text-xs font-bold uppercase tracking-widest text-center shadow-black drop-shadow-md">Moyenne Buts/Match</h3>
                        <InfoTooltip text="Ratio moyen de buts par match joué." className="ml-0" />
                    </div>
                    <div className="glass-card relative overflow-hidden group w-full h-full flex flex-col items-center justify-center py-8">
                        <div className="absolute -right-4 -top-4 bg-pink-500/10 w-24 h-24 rounded-full blur-2xl group-hover:bg-pink-500/20 transition-all"></div>
                        <div className="flex flex-col items-center gap-1 z-0">
                            <p className="text-white text-5xl font-black tracking-tighter filter drop-shadow-[0_0_10px_rgba(236,72,153,0.3)]">{stats.goalsPerMatch}</p>
                            <span className="text-pink-400 text-sm font-bold bg-pink-400/10 px-2 py-0.5 rounded-full border border-pink-400/20">Top 5 EU</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="w-full">
                {/* Main Graph: Real vs Projected */}
                <div className="card w-full bg-[#0F1C38] border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h3 className="text-lg font-bold text-white">Évolution des Buts / Journée</h3>
                            <p className="text-secondary text-xs">Comparatif Réel vs Simulation IA</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-bold">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-1 bg-white rounded-full"></div>
                                <span className="text-white">RÉEL</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-1 border-t-2 border-dashed border-accent"></div>
                                <span className="text-accent">PROJETÉ</span>
                            </div>
                        </div>
                    </div>
                    <SeasonGoalsChart schedule={schedule} currentWeek={currentWeek} teamStats={teamStats} />
                </div>
            </div>
        </div>
    );
};

export default DashboardStats;
