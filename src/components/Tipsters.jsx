import React, { useMemo } from 'react';
import { TrendingUp, User, Target, Award, CheckCircle2, XCircle, Clock } from 'lucide-react';
import tipsterData from '../data/tipster_ntk.json';

const TipsterCard = ({ match, prediction, realResult }) => {
    const isPlayed = realResult && realResult.status === 'FINISHED';

    // Validation Logic
    const validatePrediction = () => {
        if (!isPlayed) return null;

        const homeScore = realResult.score.home;
        const awayScore = realResult.score.away;

        // Result Validation (1N2)
        let resultOk = false;
        if (prediction.prediction.includes('ou nul')) {
            const team = prediction.prediction.split(' ')[0];
            if (team === realResult.homeTeam) resultOk = homeScore >= awayScore;
            else resultOk = awayScore >= homeScore;
        } else if (prediction.prediction.includes('gagne')) {
            const team = prediction.prediction.split(' ')[0];
            if (team === realResult.homeTeam) resultOk = homeScore > awayScore;
            else resultOk = awayScore > homeScore;
        } else if (prediction.prediction.includes('PSG & +2.5')) {
            resultOk = awayScore > homeScore && (homeScore + awayScore) >= 3;
        } else {
            // Default conservative check
            resultOk = null;
        }

        const scoreOk = `${homeScore}-${awayScore}` === prediction.score;

        return { resultOk, scoreOk };
    };

    const validation = validatePrediction();

    return (
        <div className="card bg-[#0F1C38] border border-white/5 relative overflow-hidden group hover:border-accent/30 transition-all">
            {/* Status Badge */}
            <div className="absolute top-4 right-4 z-10">
                {!isPlayed ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                        <Clock size={12} /> À venir
                    </div>
                ) : (
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${validation.resultOk ? 'bg-success/10 border-success/20 text-success' : 'bg-red-500/10 border-red-500/20 text-red-400'} text-[10px] font-bold uppercase tracking-wider`}>
                        {validation.resultOk ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {validation.resultOk ? 'Validé' : 'Échec'}
                    </div>
                )}
            </div>

            {/* Match Header */}
            <div className="mb-6">
                <div className="text-[10px] text-accent font-black uppercase tracking-[0.2em] mb-1">
                    Ligue 1 - J{prediction.week || match.week}
                </div>
                <h3 className="text-xl font-black text-white italic">
                    {prediction.homeTeam} <span className="text-secondary not-italic text-sm mx-2">VS</span> {prediction.awayTeam}
                </h3>
            </div>

            {/* Prediction Body */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-white/5 text-accent">
                            <TrendingUp size={16} />
                        </div>
                        <div>
                            <p className="text-[10px] text-secondary uppercase font-bold tracking-wider">Pronostic</p>
                            <p className="text-sm text-white font-bold">{prediction.prediction}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-white/5 text-pink-500">
                            <User size={16} />
                        </div>
                        <div>
                            <p className="text-[10px] text-secondary uppercase font-bold tracking-wider">Buteur à tenter</p>
                            <p className="text-sm text-white font-bold">{prediction.buteur}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-white/5 text-blue-400">
                            <Target size={16} />
                        </div>
                        <div>
                            <p className="text-[10px] text-secondary uppercase font-bold tracking-wider">Score exact</p>
                            <p className="text-sm text-white font-bold">{prediction.score}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-white/5 text-yellow-500">
                            <Award size={16} />
                        </div>
                        <div>
                            <p className="text-[10px] text-secondary uppercase font-bold tracking-wider">Confiance</p>
                            <div className="flex gap-0.5 mt-0.5">
                                {[...Array(3)].map((_, i) => (
                                    <span key={i} className={`text-base ${i < prediction.confidence ? 'text-yellow-500' : 'text-white/10'}`}>★</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Real Result Display */}
            {isPlayed && (
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] text-secondary uppercase font-bold tracking-wider">Résultat Réel</p>
                        <p className="text-lg font-black text-white">
                            {realResult.score.home} - {realResult.score.away}
                        </p>
                    </div>
                    {validation.scoreOk && (
                        <div className="px-3 py-1 rounded bg-accent text-slate-900 text-[10px] font-black uppercase italic">
                            Score Exact ! 🎯
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const Tipsters = ({ schedule }) => {
    // Flatten and group predictions
    const allPredictions = useMemo(() => {
        return tipsterData.flatMap(weekGroup =>
            weekGroup.predictions.map(p => ({ ...p, week: weekGroup.week }))
        );
    }, []);

    // Filter by week or search if needed (keep simple for now)
    return (
        <div className="space-y-12 animate-fade-in">
            {/* Header section */}
            <div className="flex flex-col items-center text-center">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#1DA1F2] flex items-center justify-center text-white shadow-lg">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-white italic tracking-tighter m-0">@NTKPRONOS</h2>
                        <p className="text-accent text-[10px] font-black uppercase tracking-[0.3em]">Tipster Officiel Ligue 1</p>
                    </div>
                </div>
                <p className="text-secondary max-w-2xl mx-auto text-sm leading-relaxed">
                    Retrouvez ici les analyses et pronostics de NTK Pronos pour chaque journée de Ligue 1.
                    Nous comparons automatiquement les prévisions avec les résultats réels du championnat.
                </p>
            </div>

            {/* Predictions Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {allPredictions.sort((a, b) => b.week - a.week).map((pred, index) => {
                    const real = schedule.find(m =>
                        m.week === pred.week &&
                        m.homeTeam === pred.homeTeam &&
                        m.awayTeam === pred.awayTeam
                    );
                    return <TipsterCard key={index} prediction={pred} realResult={real} />;
                })}
            </div>
        </div>
    );
};

export default Tipsters;
