import React, { useState, useMemo } from 'react';
import { ShieldAlert, UserCog } from 'lucide-react';
import coachesData from '../data/coaches_stats_calculated.json';

const CoachFocus = () => {
    const [sortConfig, setSortConfig] = useState({ key: 'yellowCards', direction: 'desc' });
    const [searchTerm, setSearchTerm] = useState('');

    const coachesList = useMemo(() => {
        let allCoaches = [];
        Object.keys(coachesData).forEach(team => {
            coachesData[team].forEach(c => {
                allCoaches.push({ ...c, team });
            });
        });

        if (searchTerm) {
            allCoaches = allCoaches.filter(c =>
                c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.team.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        allCoaches.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });

        return allCoaches;
    }, [searchTerm, sortConfig]);

    const handleSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            <div className="flex justify-between items-center bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-xl">
                <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-3">
                        <UserCog className="text-secondary" size={28} />
                        Focus Entraîneurs
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">Discipline et avertissements des staffs techniques.</p>
                </div>

                <div className="relative">
                    <input
                        type="text"
                        placeholder="Rechercher un entraîneur ou un club..."
                        className="w-80 bg-slate-900/50 text-white rounded-xl px-4 py-3 pb-2 border border-white/10 focus:border-secondary focus:outline-none transition-colors"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden mt-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900/80 text-secondary text-xs font-black uppercase tracking-widest border-b border-white/10">
                                <th className="px-6 py-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort('name')}>
                                    Entraîneur {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="px-6 py-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort('team')}>
                                    Club {sortConfig.key === 'team' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="px-6 py-4 text-center cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort('yellowCards')}>
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-3 h-4 bg-yellow-400 rounded-sm shadow-sm" />
                                        Cartons Jaunes {sortConfig.key === 'yellowCards' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </span>
                                </th>
                                <th className="px-6 py-4 text-center cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort('redCards')}>
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-3 h-4 bg-red-500 rounded-sm shadow-sm" />
                                        Cartons Rouges {sortConfig.key === 'redCards' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-medium">
                            {coachesList.length > 0 ? (
                                coachesList.map((coach, index) => (
                                    <tr
                                        key={`${coach.name}-${index}`}
                                        className="border-b border-white/5 hover:bg-white/5 transition-colors text-slate-200"
                                    >
                                        <td className="px-6 py-4 font-bold text-white flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-black text-secondary">
                                                {coach.name.charAt(0)}
                                            </div>
                                            {coach.name}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 bg-slate-800/50 rounded-full text-xs font-bold text-slate-300 border border-white/5">
                                                {coach.team}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {coach.yellowCards > 0 ? (
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500/10 text-yellow-500 font-bold">
                                                    {coach.yellowCards}
                                                </span>
                                            ) : (
                                                <span className="text-slate-600">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {coach.redCards > 0 ? (
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-500/10 text-red-500 font-bold">
                                                    {coach.redCards}
                                                </span>
                                            ) : (
                                                <span className="text-slate-600">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-slate-400">
                                        <ShieldAlert size={48} className="mx-auto mb-4 opacity-50" />
                                        Aucun entraîneur trouvé.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CoachFocus;
