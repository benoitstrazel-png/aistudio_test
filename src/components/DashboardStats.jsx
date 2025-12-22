import React from 'react';
import SeasonGoalsChart from './SeasonGoalsChart';

const DashboardStats = ({ stats, schedule, currentWeek, teamStats }) => {
    return (
        <div className="flex flex-col gap-6">
            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 bg-accent/10 w-24 h-24 rounded-full blur-2xl group-hover:bg-accent/20 transition-all"></div>
                    <h3 className="text-secondary text-xs font-bold uppercase tracking-widest mb-2">Buts Total Saison</h3>
                    <div className="flex items-baseline gap-2">
                        <p className="text-white text-4xl font-black tracking-tighter">{stats.totalGoals}</p>
                        <span className="text-accent text-sm font-bold">+12%</span>
                    </div>
                </div>
                <div className="glass-card relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 bg-blue-500/10 w-24 h-24 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
                    <h3 className="text-secondary text-xs font-bold uppercase tracking-widest mb-2">Moyenne Buts/Journée</h3>
                    <div className="flex items-baseline gap-2">
                        <p className="text-white text-4xl font-black tracking-tighter">{stats.goalsPerDay}</p>
                        <span className="text-blue-400 text-sm font-bold">Stable</span>
                    </div>
                </div>
                <div className="glass-card relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 bg-pink-500/10 w-24 h-24 rounded-full blur-2xl group-hover:bg-pink-500/20 transition-all"></div>
                    <h3 className="text-secondary text-xs font-bold uppercase tracking-widest mb-2">Moyenne Buts/Match</h3>
                    <div className="flex items-baseline gap-2">
                        <p className="text-white text-4xl font-black tracking-tighter">{stats.goalsPerMatch}</p>
                        <span className="text-pink-400 text-sm font-bold">Top 5 EU</span>
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
