import React from 'react';

const MatchPrediction = ({ match }) => {
    const { prediction, odds } = match;

    const getConfidenceColor = (conf) => {
        if (conf >= 80) return 'text-success';
        if (conf >= 60) return 'text-warning';
        return 'text-danger';
    };

    return (
        <div className="flex flex-col gap-4">

            {/* Odds Box */}
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="glass-card p-2 flex flex-col">
                    <span className="text-secondary">1 ({match.homeTeam})</span>
                    <span className="font-bold">{odds.home}</span>
                </div>
                <div className="glass-card p-2 flex flex-col">
                    <span className="text-secondary">N</span>
                    <span className="font-bold">{odds.draw}</span>
                </div>
                <div className="glass-card p-2 flex flex-col">
                    <span className="text-secondary">2 ({match.awayTeam})</span>
                    <span className="font-bold">{odds.away}</span>
                </div>
            </div>

            {/* AI Prediction */}
            <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-color)' }}>
                <h3 className="text-accent mb-2">Prédiction AI</h3>

                <div className="flex justify-between items-center mb-2">
                    <span>Score estimé :</span>
                    <span className="font-bold text-xl">{prediction.score}</span>
                </div>

                <div className="flex justify-between items-center mb-2">
                    <span>Vainqueur probable :</span>
                    <span className="font-bold">{prediction.winner}</span>
                </div>

                <div className="flex justify-between items-center mb-4">
                    <span>Confiance :</span>
                    <span style={{ color: prediction.confidence >= 80 ? 'var(--success-color)' : prediction.confidence >= 60 ? 'var(--warning-color)' : 'var(--danger-color)' }}>
                        {prediction.confidence}%
                    </span>
                </div>

                <div className="bg-slate-800 p-3 rounded">
                    <span className="text-secondary text-xs uppercase tracking-wider">Conseil Pari</span>
                    <p className="font-bold text-lg text-accent mt-1">{prediction.advice}</p>
                </div>
            </div>
        </div>
    );
};

export default MatchPrediction;
