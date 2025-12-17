import React from 'react';

const DashboardStats = ({ stats }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card">
                <h3 className="text-secondary text-sm">Buts Total Saison</h3>
                <p className="text-accent" style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalGoals}</p>
            </div>
            <div className="glass-card">
                <h3 className="text-secondary text-sm">Moyenne Buts/Journée</h3>
                <p className="text-accent" style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.goalsPerDay}</p>
            </div>
            <div className="glass-card">
                <h3 className="text-secondary text-sm">Moyenne Buts/Match</h3>
                <p className="text-accent" style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.goalsPerMatch}</p>
            </div>
        </div>
    );
};

export default DashboardStats;
