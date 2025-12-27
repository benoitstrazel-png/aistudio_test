
import React, { useState, useEffect } from 'react';
import { getSnapshots, comparePredictions, savePredictionSnapshot, seedMockHistory } from '../utils/predictionHistory';
import TeamLogo from './ui/TeamLogo';

const ForecastReview = ({ schedule, currentWeek }) => {
    const [snapshots, setSnapshots] = useState([]);
    const [selectedSnapshotId, setSelectedSnapshotId] = useState('');
    const [targetWeek, setTargetWeek] = useState(currentWeek.toString());
    const [comparisonData, setComparisonData] = useState(null);

    // Initial Load
    useEffect(() => {
        // Seed mock data for demo if empty
        seedMockHistory(schedule);

        const loaded = getSnapshots();
        setSnapshots(loaded);
        if (loaded.length > 0) {
            setSelectedSnapshotId(loaded[0].id); // Default to first (usually mock or latest)
        }
    }, [schedule]);

    // Update Comparison when selections change
    useEffect(() => {
        if (selectedSnapshotId && targetWeek) {
            const data = comparePredictions(selectedSnapshotId, targetWeek, schedule);
            setComparisonData(data);
        }
    }, [selectedSnapshotId, targetWeek, schedule]);

    const handleSaveSnapshot = () => {
        savePredictionSnapshot(currentWeek, schedule);
        // Reload list
        const loaded = getSnapshots();
        setSnapshots(loaded);
        setSelectedSnapshotId(loaded[loaded.length - 1].id); // Select new one
    };

    // Derived lists
    const weeksList = Array.from(new Set(schedule.map(m => m.week))).sort((a, b) => a - b);

    if (!comparisonData) return <div className="text-white">Chargement...</div>;

    return (
        <div className="flex flex-col gap-8">
            {/* CONTROLS HEADER */}
            <div className="card bg-[#0B1426] p-6 border-b-4 border-accent">
                <div className="flex flex-col md:flex-row justify-between items-end gap-6">

                    {/* LEFT: SELECTORS */}
                    <div className="flex flex-col md:flex-row gap-6 w-full md:w-auto">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] uppercase font-bold text-secondary tracking-widest">
                                📅 Source des Prévisions
                            </label>
                            <select
                                value={selectedSnapshotId}
                                onChange={(e) => setSelectedSnapshotId(e.target.value)}
                                className="bg-slate-800 text-white p-3 rounded-xl border border-white/10 outline-none focus:border-accent font-bold min-w-[200px]"
                            >
                                {snapshots.map(s => (
                                    <option key={s.id} value={s.id}>{s.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] uppercase font-bold text-secondary tracking-widest">
                                🎯 Résultats Cible (Journée)
                            </label>
                            <select
                                value={targetWeek}
                                onChange={(e) => setTargetWeek(e.target.value)}
                                className="bg-slate-800 text-white p-3 rounded-xl border border-white/10 outline-none focus:border-accent font-bold min-w-[100px]"
                            >
                                {weeksList.filter(w => w <= currentWeek).map(w => (
                                    <option key={w} value={w}>Journée {w}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* RIGHT: METRICS */}
                    <div className="flex gap-4">
                        <div className="flex flex-col items-center bg-white/5 p-3 rounded-xl min-w-[100px] border border-white/5">
                            <span className="text-3xl font-black text-white">{comparisonData.metrics.accuracy}%</span>
                            <span className="text-[10px] uppercase text-accent font-bold">Vainqueur Correct</span>
                        </div>
                        <div className="flex flex-col items-center bg-white/5 p-3 rounded-xl min-w-[100px] border border-white/5">
                            <span className="text-3xl font-black text-blue-400">{comparisonData.metrics.exactAccuracy}%</span>
                            <span className="text-[10px] uppercase text-blue-400 font-bold">Score Exact</span>
                        </div>
                    </div>

                </div>

                {/* DEBUG SAVE BUTTON (Hidden in production ideally, but useful for demo) */}
                <div className="mt-4 pt-4 border-t border-white/5 flex justify-end">
                    <button
                        onClick={handleSaveSnapshot}
                        className="text-xs text-slate-500 hover:text-white underline"
                    >
                        📸 Sauvegarder les prédictions actuelles (Debug)
                    </button>
                </div>
            </div>

            {/* COMPARISON TABLE */}
            <div className="card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 uppercase text-xs font-bold text-secondary tracking-widest">
                            <tr>
                                <th className="p-4">Rencontre</th>
                                <th className="p-4 text-center">Prévision (J{snapshots.find(s => s.id === selectedSnapshotId)?.week || '?'})</th>
                                <th className="p-4 text-center">Résultat Réel</th>
                                <th className="p-4 text-center">Statut</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {comparisonData.matches.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-slate-500 italic">
                                        Aucun match trouvé pour cette journée dans l'historique selectionné.
                                    </td>
                                </tr>
                            ) : (
                                comparisonData.matches.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                                        {/* MATCH */}
                                        <td className="p-4">
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2 w-[120px] justify-end">
                                                    <span className="font-bold text-white text-right">{item.match.homeTeam}</span>
                                                    <TeamLogo teamName={item.match.homeTeam} size="sm" />
                                                </div>
                                                <span className="text-slate-500 text-xs">vs</span>
                                                <div className="flex items-center gap-2 w-[120px]">
                                                    <TeamLogo teamName={item.match.awayTeam} size="sm" />
                                                    <span className="font-bold text-white">{item.match.awayTeam}</span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* PREVISION */}
                                        <td className="p-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-lg font-mono font-bold text-secondary">
                                                    {item.prediction.score}
                                                </span>
                                                <span className="text-[10px] uppercase text-slate-500">
                                                    {item.prediction.winner === 'Draw' ? 'Nul' : item.prediction.winner}
                                                    {item.prediction.confidence && ` (${item.prediction.confidence}%)`}
                                                </span>
                                            </div>
                                        </td>

                                        {/* REALITY */}
                                        <td className="p-4 text-center">
                                            {item.match.status === 'FINISHED' ? (
                                                <span className="text-lg font-mono font-black text-white">
                                                    {item.match.score.home}-{item.match.score.away}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-500 italic">Non joué</span>
                                            )}
                                        </td>

                                        {/* STATUS */}
                                        <td className="p-4 text-center">
                                            {item.match.status === 'FINISHED' ? (
                                                <div className="flex justify-center">
                                                    {item.status === 'correct' ? (
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${item.exactScore ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'bg-green-500/20 text-green-400 border border-green-500/50'}`}>
                                                            {item.exactScore ? 'Score Exact' : 'Correct'}
                                                        </span>
                                                    ) : (
                                                        <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/50 text-xs font-bold uppercase tracking-wider">
                                                            Incorrect
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-slate-600">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ForecastReview;
