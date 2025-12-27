import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from 'recharts';
import playersData from '../data/players_db.json';

const PlayerFocus = () => {
    console.log("PlayerFocus loaded. Data length:", playersData?.length, "Sample:", playersData?.[0]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'Gls', direction: 'desc' });
    const [selectedMetric, setSelectedMetric] = useState('Gls');

    // Filter and sort players
    const filteredPlayers = useMemo(() => {
        let players = [...playersData];

        // Filter by search term
        if (searchTerm) {
            players = players.filter(p =>
                p.Player.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.Squad.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Sort
        players.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
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
        return [...playersData].sort((a, b) => b.Gls - a.Gls).slice(0, 10);
    }, []);

    const topAssisters = useMemo(() => {
        return [...playersData].sort((a, b) => b.Ast - a.Ast).slice(0, 10);
    }, []);

    const efficiencyData = useMemo(() => {
        return playersData
            .filter(p => p.Gls > 2) // Only show relevant players
            .map(p => ({
                name: p.Player,
                x: p.xG,
                y: p.Gls,
                z: p.Min, // Bubble size based on minutes played
                squad: p.Squad
            }));
    }, []);

    return (
        <div className="space-y-6 animate-fade-in">
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
                <div className="glass-card p-6 rounded-2xl border border-white/10">
                    <h3 className="text-xl font-bold text-white mb-1">Efficacité Offensive</h3>
                    <p className="text-xs text-slate-400 mb-4">Buts Réels vs Expected Goals (xG)</p>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis type="number" dataKey="x" name="xG" unit="" stroke="#94a3b8" label={{ value: 'Expected Goals (xG)', position: 'bottom', offset: 0, fill: '#94a3b8', fontSize: 12 }} />
                                <YAxis type="number" dataKey="y" name="Buts" unit="" stroke="#94a3b8" label={{ value: 'Buts Réels', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }} />
                                <ZAxis type="number" dataKey="z" range={[50, 400]} name="Minutes" />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                                <Scatter name="Joueurs" data={efficiencyData} fill="#f43f5e" fillOpacity={0.6} />
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Metrics Bar Chart */}
                <div className="glass-card p-6 rounded-2xl border border-white/10">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-white mb-1">Top 10 Performers</h3>
                            <p className="text-xs text-slate-400">Classement par métrique</p>
                        </div>
                        <select
                            className="bg-slate-800 border-none text-white text-sm rounded-lg p-2 focus:ring-2 focus:ring-accent"
                            value={selectedMetric}
                            onChange={(e) => setSelectedMetric(e.target.value)}
                        >
                            <option value="Gls">Buts</option>
                            <option value="Ast">Passes D.</option>
                            <option value="xG">xG</option>
                            <option value="npxG">npxG</option>
                            <option value="xAG">xAG</option>
                        </select>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={[...playersData].sort((a, b) => b[selectedMetric] - a[selectedMetric]).slice(0, 10)}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                                <XAxis type="number" stroke="#94a3b8" />
                                <YAxis type="category" dataKey="Player" stroke="#94a3b8" width={100} tick={{ fontSize: 11 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} cursor={{ fill: '#ffffff10' }} />
                                <Bar dataKey={selectedMetric} fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
                <div className="p-4 border-b border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h3 className="text-lg font-bold text-white">Base de Données Joueurs</h3>
                    <input
                        type="text"
                        placeholder="Rechercher un joueur ou une équipe..."
                        className="bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 text-sm text-white w-full md:w-64 focus:outline-none focus:border-accent"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-300">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-900/50">
                            <tr>
                                <th className="px-6 py-3 cursor-pointer hover:text-white" onClick={() => requestSort('Player')}>Joueur</th>
                                <th className="px-6 py-3 cursor-pointer hover:text-white" onClick={() => requestSort('Squad')}>Club</th>
                                <th className="px-6 py-3 cursor-pointer hover:text-white" onClick={() => requestSort('Pos')}>Pos</th>
                                <th className="px-6 py-3 cursor-pointer hover:text-white" onClick={() => requestSort('Age')}>Age</th>
                                <th className="px-6 py-3 text-right cursor-pointer hover:text-white" onClick={() => requestSort('MP')}>Matchs</th>
                                <th className="px-6 py-3 text-right cursor-pointer hover:text-white" onClick={() => requestSort('Min')}>Min</th>
                                <th className="px-6 py-3 text-right cursor-pointer hover:text-white text-accent" onClick={() => requestSort('Gls')}>Buts</th>
                                <th className="px-6 py-3 text-right cursor-pointer hover:text-white text-cyan-400" onClick={() => requestSort('Ast')}>Passes</th>
                                <th className="px-6 py-3 text-right cursor-pointer hover:text-white" onClick={() => requestSort('xG')}>xG</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPlayers.map((player, index) => (
                                <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 font-medium text-white">{player.Player}</td>
                                    <td className="px-6 py-4">{player.Squad}</td>
                                    <td className="px-6 py-4">{player.Pos}</td>
                                    <td className="px-6 py-4">{player.Age}</td>
                                    <td className="px-6 py-4 text-right">{player.MP}</td>
                                    <td className="px-6 py-4 text-right">{player.Min}</td>
                                    <td className="px-6 py-4 text-right font-bold text-accent">{player.Gls}</td>
                                    <td className="px-6 py-4 text-right font-bold text-cyan-400">{player.Ast}</td>
                                    <td className="px-6 py-4 text-right">{player.xG}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-3 text-center text-xs text-slate-500 border-t border-white/10">
                    Affichage de {filteredPlayers.length} joueurs
                </div>
            </div>
        </div>
    );
};

export default PlayerFocus;
