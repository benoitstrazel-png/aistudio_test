import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from 'recharts';
import { PLAYERS_DB as playersData } from '../data/players_static';

import PlayerDetailsModal from './PlayerDetailsModal';

const PlayerFocus = () => {
    const [selectedLeague, setSelectedLeague] = useState('fr Ligue 1');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'Gls', direction: 'desc' });
    const [selectedMetric, setSelectedMetric] = useState('Gls');
    const [selectedPlayer, setSelectedPlayer] = useState(null);

    // Constants
    const TEAM_MAPPING = {
        'Paris S-G': 'PSG',
        'Saint-Étienne': 'Saint-Etienne' // Just in case
    };

    const LEAGUES = [
        { id: 'fr Ligue 1', name: 'Ligue 1 (France)' },
        { id: 'eng Premier League', name: 'Premier League (Angleterre)' },
        { id: 'es La Liga', name: 'La Liga (Espagne)' },
        { id: 'it Serie A', name: 'Serie A (Italie)' },
        { id: 'de Bundesliga', name: 'Bundesliga (Allemagne)' }
    ];

    // Filter and sort players
    const filteredPlayers = useMemo(() => {
        if (!playersData) return [];
        let players = [...playersData];

        // 1. Filter by League
        if (selectedLeague !== 'all') {
            players = players.filter(p => p.League === selectedLeague);
        }

        // 2. Normalize Data & Filter by search term
        const normalizeString = (str) => {
            return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
        };

        players = players.map(p => ({
            ...p,
            Squad: TEAM_MAPPING[p.Squad] || p.Squad // Normalize Squad Name
        })).filter(p => {
            if (!searchTerm) return true;
            const searchNormalized = normalizeString(searchTerm);
            return normalizeString(p.Player).includes(searchNormalized) ||
                normalizeString(p.Squad).includes(searchNormalized);
        });

        // 3. Sort
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
    }, [searchTerm, sortConfig, selectedLeague]);

    const requestSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const topScorers = useMemo(() => {
        // Use filteredPlayers to respect league selection OR compute from raw data if we want global stats? 
        // Better to show top scorers of the SELECTED league.
        return [...filteredPlayers].sort((a, b) => (b.Gls || 0) - (a.Gls || 0)).slice(0, 10);
    }, [filteredPlayers]); // Depend on filteredPlayers

    const topAssisters = useMemo(() => {
        return [...filteredPlayers].sort((a, b) => (b.Ast || 0) - (a.Ast || 0)).slice(0, 10);
    }, [filteredPlayers]);

    const efficiencyData = useMemo(() => {
        return filteredPlayers
            .filter(p => p.Gls > 2)
            .map(p => ({
                name: p.Player,
                x: p.xG || 0,
                y: p.Gls || 0,
                z: p.Min || 0,
                squad: p.Squad // Already normalized in filteredPlayers
            }));
    }, [filteredPlayers]);

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
        <div className="space-y-12 animate-fade-in relative">
            {/* Modal Overlay */}
            {selectedPlayer && (
                <PlayerDetailsModal
                    player={selectedPlayer}
                    onClose={() => setSelectedPlayer(null)}
                />
            )}

            {/* DEBUG BANNER (Temporaire) */}
            <div className="bg-blue-900/50 border border-blue-500 p-2 rounded text-xs text-blue-200 text-center">
                DEBUG INFO: Chargé {playersData.length} joueurs. Build: {new Date().toISOString()}
            </div>

            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                        <div className="text-4xl text-emerald-400 font-black">{filteredPlayers.length}</div>
                        <div className="text-xs text-slate-400 max-w-[150px]">
                            {selectedLeague === 'all' ? 'Tous championnats confondus' : LEAGUES.find(l => l.id === selectedLeague)?.name || selectedLeague}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                                data={[...filteredPlayers].sort((a, b) => (b[selectedMetric] || 0) - (a[selectedMetric] || 0)).slice(0, 10)}
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
                <div className="p-4 border-b border-white/10 flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <h3 className="text-lg font-bold mb-2">Base de Données Joueurs</h3>
                        <input
                            type="text"
                            placeholder="Rechercher un joueur ou une équipe..."
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-accent transition-colors"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="w-full md:w-64">
                        <h3 className="text-sm font-bold mb-2 text-slate-400">Filtrer par Championnat</h3>
                        <select
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-accent"
                            value={selectedLeague}
                            onChange={(e) => setSelectedLeague(e.target.value)}
                        >
                            {LEAGUES.map(l => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                            <option value="all">Tous les championnats</option>
                        </select>
                    </div>
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
                                    <tr
                                        key={index}
                                        className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                                        onClick={() => setSelectedPlayer(player)}
                                    >
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
