import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from 'recharts';
import playersData from '../data/players_optimized.json';

const PlayerFocus = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'Gls', direction: 'desc' });
    const [selectedMetric, setSelectedMetric] = useState('Gls');

    // Filter and sort players
    const filteredPlayers = useMemo(() => {
        if (!playersData) return [];
        let players = [...playersData];

        // Filter by search term
        if (searchTerm) {
            players = players.filter(p =>
                (p.Player && p.Player.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (p.Squad && p.Squad.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // Sort
        players.sort((a, b) => {
            const aVal = a[sortConfig.key] || 0;
            const bVal = b[sortConfig.key] || 0;

            if (aVal < bVal) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aVal > bVal) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });

        return players;
    }, [searchTerm, sortConfig]);

    const requestSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const topScorers = useMemo(() => {
        return [...playersData].sort((a, b) => (b.Gls || 0) - (a.Gls || 0)).slice(0, 10);
    }, []);

    const topAssisters = useMemo(() => {
        return [...playersData].sort((a, b) => (b.Ast || 0) - (a.Ast || 0)).slice(0, 10);
    }, []);

    const efficiencyData = useMemo(() => {
        return playersData
            .filter(p => p.Gls > 2)
            .map(p => ({
                name: p.Player,
                x: p.xG || 0,
                y: p.Gls || 0,
                z: p.Min || 0,
                squad: p.Squad
            }));
    }, []);

    // DEBUG: Aider à diagnostiquer le problème sur Vercel
    if (!playersData || playersData.length === 0) {
        return (
            <div className="p-8 text-center border-2 border-red-500 rounded-xl bg-red-900/20 text-white">
                <h2 className="text-2xl font-bold mb-4">⚠️ DEBUG: Aucune donnée joueur trouvée</h2>
                <p>Le fichier JSON semble vide ou non chargé.</p>
                <p className="text-sm mt-2 font-mono">playersData: {JSON.stringify(playersData)}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* DEBUG BANNER (Temporaire) */}
            <div className="bg-blue-900/50 border border-blue-500 p-2 rounded text-xs text-blue-200 text-center">
                DEBUG INFO: Chargé {playersData.length} joueurs. Premier joueur: {playersData[0]?.Player} ({playersData[0]?.Squad})
            </div>

            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-4 rounded-xl border border-white/10">
                    <h3 className="text-secondary text-sm font-bold uppercase tracking-wider mb-2">Meilleur Buteur</h3>
                    <div className="flex items-center space-x-3">
                        <div className="text-4xl text-accent font-black">{topScorers[0]?.Gls || 0}</div>
                        <div>
                            <div className="font-bold text-white">{topScorers[0]?.Player || 'N/A'}</div>
                            <div className="text-xs text-slate-400">{topScorers[0]?.Squad || 'N/A'}</div>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-4 rounded-xl border border-white/10">
                    <h3 className="text-secondary text-sm font-bold uppercase tracking-wider mb-2">Meilleur Passeur</h3>
                    <div className="flex items-center space-x-3">
                        <div className="text-4xl text-cyan-400 font-black">{topAssisters[0]?.Ast || 0}</div>
                        <div>
                            <div className="font-bold text-white">{topAssisters[0]?.Player || 'N/A'}</div>
                            <div className="text-xs text-slate-400">{topAssisters[0]?.Squad || 'N/A'}</div>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-4 rounded-xl border border-white/10">
                    <h3 className="text-secondary text-sm font-bold uppercase tracking-wider mb-2">Joueurs Analysés</h3>
                    <div className="flex items-center space-x-3">
                        <div className="text-4xl text-emerald-400 font-black">{playersData.length}</div>
                        <div className="text-xs text-slate-400 max-w-[150px]">
                            Données extraites de Kaggle (Mise à jour : Mardi 20h)
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Efficiency Chart */}
                <div className="glass-card p-6 rounded-xl border border-white/10">
                    <h3 className="text-xl font-bold mb-4">Efficacité Offensive</h3>
                    <p className="text-sm text-slate-400 mb-4">Buts Réels vs Expected Goals (xG)</p>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis type="number" dataKey="x" name="xG" unit="" stroke="#94a3b8" label={{ value: 'xG (Expected Goals)', position: 'bottom', fill: '#94a3b8' }} />
                                <YAxis type="number" dataKey="y" name="Buts" unit="" stroke="#94a3b8" label={{ value: 'Buts', angle: -90, position: 'left', fill: '#94a3b8' }} />
                                <ZAxis type="number" dataKey="z" range={[50, 400]} name="Minutes" />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }}
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                    formatter={(value, name, props) => {
                                        if (name === 'x') return [value, 'xG'];
                                        if (name === 'y') return [value, 'Buts'];
                                        return [value, name];
                                    }}
                                />
                                <Scatter name="Joueurs" data={efficiencyData} fill="#facc15" />
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Performers Bar Chart */}
                <div className="glass-card p-6 rounded-xl border border-white/10">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold">Top 10 Performers</h3>
                        <select
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm outline-none focus:border-accent"
                            value={selectedMetric}
                            onChange={(e) => setSelectedMetric(e.target.value)}
                        >
                            <option value="Gls">Buts</option>
                            <option value="Ast">Passes</option>
                            <option value="xG">xG</option>
                            <option value="xAG">xAG</option>
                            <option value="SCA">SCA</option>
                        </select>
                    </div>
                    <p className="text-sm text-slate-400 mb-4">Classement par métrique</p>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={[...playersData].sort((a, b) => (b[selectedMetric] || 0) - (a[selectedMetric] || 0)).slice(0, 10)}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                <XAxis type="number" stroke="#94a3b8" />
                                <YAxis dataKey="Player" type="category" width={100} stroke="#94a3b8" tick={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey={selectedMetric} fill="#3b82f6" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="glass-card rounded-xl border border-white/10 overflow-hidden">
                <div className="p-4 border-b border-white/10">
                    <h3 className="text-lg font-bold mb-4">Base de Données Joueurs</h3>
                    <input
                        type="text"
                        placeholder="Rechercher un joueur ou une équipe..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-accent transition-colors"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-3 cursor-pointer hover:text-white transition-colors" onClick={() => requestSort('Player')}>
                                    Joueur {sortConfig.key === 'Player' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="px-6 py-3 cursor-pointer hover:text-white transition-colors" onClick={() => requestSort('Squad')}>
                                    Club {sortConfig.key === 'Squad' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="px-6 py-3 cursor-pointer hover:text-white transition-colors" onClick={() => requestSort('Pos')}>
                                    Pos {sortConfig.key === 'Pos' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="px-6 py-3 cursor-pointer hover:text-white transition-colors" onClick={() => requestSort('Age')}>
                                    Age {sortConfig.key === 'Age' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="px-6 py-3 text-right cursor-pointer hover:text-white transition-colors" onClick={() => requestSort('MP')}>
                                    Matchs {sortConfig.key === 'MP' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="px-6 py-3 text-right cursor-pointer hover:text-white transition-colors" onClick={() => requestSort('Min')}>
                                    Min {sortConfig.key === 'Min' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="px-6 py-3 text-right cursor-pointer hover:text-accent transition-colors text-accent font-bold" onClick={() => requestSort('Gls')}>
                                    Buts {sortConfig.key === 'Gls' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="px-6 py-3 text-right cursor-pointer hover:text-white transition-colors" onClick={() => requestSort('Ast')}>
                                    Passes {sortConfig.key === 'Ast' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="px-6 py-3 text-right cursor-pointer hover:text-white transition-colors" onClick={() => requestSort('xG')}>
                                    xG {sortConfig.key === 'xG' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {filteredPlayers.length > 0 ? (
                                filteredPlayers.map((player, index) => (
                                    <tr key={index} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 font-medium text-white">{player.Player}</td>
                                        <td className="px-6 py-4">{player.Squad}</td>
                                        <td className="px-6 py-4">{player.Pos}</td>
                                        <td className="px-6 py-4">{player.Age}</td>
                                        <td className="px-6 py-4 text-right">{player.MP}</td>
                                        <td className="px-6 py-4 text-right">{player.Min}</td>
                                        <td className="px-6 py-4 text-right font-bold text-accent">{player.Gls}</td>
                                        <td className="px-6 py-4 text-right">{player.Ast}</td>
                                        <td className="px-6 py-4 text-right">{player.xG}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="9" className="px-6 py-8 text-center text-slate-400">
                                        Aucun joueur trouvé.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-white/10 text-xs text-slate-500 text-center">
                    Affichage de {filteredPlayers.length} joueurs
                </div>
            </div>
        </div>
    );
};

export default PlayerFocus;
