import React from 'react';
import SeasonGoalsChart from './SeasonGoalsChart';
import SeasonMetrics from './SeasonMetrics';

const DashboardStats = ({ stats }) => {
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {/* Main Graph: Real vs Projected */}
                <div className="card" style={{ gridColumn: 'span 2', backgroundColor: '#0F1C38', borderColor: 'rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <div>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'white' }}>Évolution des Buts / Journée</h3>
                            <p style={{ color: '#94a3b8', fontSize: '12px' }}>Comparatif Réel vs Simulation IA</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '12px', fontWeight: 'bold' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ width: '2rem', height: '4px', backgroundColor: 'white', borderRadius: '9999px' }}></div>
                                <span style={{ color: 'white' }}>RÉEL</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ width: '2rem', height: '0', borderTop: '2px dashed #CEF002' }}></div>
                                <span style={{ color: '#CEF002' }}>PROJETÉ</span>
                            </div>
                        </div>
                    </div>
                    <SeasonGoalsChart />
                </div>

                {/* Side Metrics */}
                <div style={{ flex: 1 }}>
                    <SeasonMetrics />
                </div>
            </div>
        </div>
    );
};

export default DashboardStats;
