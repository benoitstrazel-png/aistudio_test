import React, { useState, useEffect } from 'react';
import DashboardStats from './components/DashboardStats';
import NextMatchRadar from './components/NextMatchRadar';
import MatchPrediction from './components/MatchPrediction';
import Standings from './components/Standings';
import PlayerStats from './components/PlayerStats';
import MatchHistory from './components/MatchHistory';
import LeagueCalendar from './components/LeagueCalendar';
import InfoTooltip from './components/ui/InfoTooltip';
// Load JSON directly (Vite supports this)
import APP_DATA from './data/app_data.json';
import PLAYERS_DATA from './data/players.json';
// Fallback stats if needed
const TEAM_STATS = APP_DATA.teamStats || {};

import { predictMatchLive } from './utils/prediction';

function App() {
    // Default to first match or mock
    const [selectedMatch, setSelectedMatch] = useState(APP_DATA.nextMatches[0] || {});
    const [teams, setTeams] = useState([]);

    useEffect(() => {
        if (APP_DATA.teamStats) {
            setTeams(Object.keys(APP_DATA.teamStats).sort());
        }
    }, []);

    const handleTeamChange = (type, teamName) => {
        const newMatch = { ...selectedMatch };
        if (type === 'home') newMatch.homeTeam = teamName;
        if (type === 'away') newMatch.awayTeam = teamName;

        // Re-calculate prediction
        const pred = predictMatchLive(newMatch.homeTeam, newMatch.awayTeam, TEAM_STATS);
        newMatch.prediction = pred;

        // Update odds roughly based on conf
        newMatch.odds = {
            home: (3 - (pred.confidence / 100) * 2).toFixed(2),
            draw: 3.50,
            away: (3 + (pred.confidence / 100)).toFixed(2)
        };

        setSelectedMatch(newMatch);
    };

    return (
        <div className="container">
            <header className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1 className="text-accent flex items-center gap-2">
                        Ligue 1 <span className="text-secondary" style={{ fontSize: '0.6em' }}>Live Predictor</span>
                    </h1>
                    <p className="text-secondary">Saison 2025-2026</p>
                </div>
            </header>

            <main className="grid grid-cols-1 gap-6">
                {/* Top Stats Row */}
                <section>
                    <div className="flex items-center mb-2">
                        <h2 className="text-sm uppercase tracking-widest text-secondary">Statistiques Saison</h2>
                        <InfoTooltip text="Moyennes calculées sur tous les matchs joués de la saison en cours (J1 -> Aujourd'hui)." />
                    </div>
                    <DashboardStats stats={APP_DATA.seasonStats} />
                </section>

                {/* Main Content Grid */}
                <div className="grid lg:grid-cols-12 gap-6">

                    {/* LEFT COLUMN (8/12) - Analysis */}
                    <div className="lg:col-span-8 flex flex-col gap-6">

                        {/* Match Simulator Block */}
                        <div className="card">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center">
                                    <h2 className="text-accent">Simulateur & Analyse</h2>
                                    <InfoTooltip text="Choisissez deux équipes pour simuler une rencontre. L'IA utilise la Forces d'Attaque/Défense (calculée sur l'historique récent) pour prédire le score." />
                                </div>
                            </div>

                            <div className="flex justify-between items-center gap-4 mb-6 bg-slate-800 p-4 rounded-xl">
                                <select
                                    className="p-2 rounded bg-slate-700 text-white w-full border border-slate-600 focus:border-accent outline-none"
                                    value={selectedMatch.homeTeam}
                                    onChange={(e) => handleTeamChange('home', e.target.value)}
                                >
                                    {teams.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <span className="text-secondary font-bold text-xl">VS</span>
                                <select
                                    className="p-2 rounded bg-slate-700 text-white w-full border border-slate-600 focus:border-accent outline-none"
                                    value={selectedMatch.awayTeam}
                                    onChange={(e) => handleTeamChange('away', e.target.value)}
                                >
                                    {teams.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <MatchPrediction match={selectedMatch} />
                                <NextMatchRadar homeTeam={selectedMatch.homeTeam} awayTeam={selectedMatch.awayTeam} teamStats={TEAM_STATS} />
                            </div>
                        </div>

                        {/* History below simulation */}
                        <MatchHistory match={selectedMatch} />

                        {/* Calendar Block (Full Width of Left col) */}
                        <LeagueCalendar
                            schedule={APP_DATA.fullSchedule || []}
                            currentWeek={APP_DATA.currentWeek}
                        />
                    </div>

                    {/* RIGHT COLUMN (4/12) - Standings */}
                    <div className="lg:col-span-4 flex flex-col gap-6">
                        <Standings
                            standings={APP_DATA.standings}
                            schedule={APP_DATA.fullSchedule}
                            currentWeek={APP_DATA.currentWeek}
                        />

                        {/* Player Stats (Hidden as requested, uncomment to enable) */}
                        {/* 
                        <div className="relative">
                            <div className="absolute inset-0 bg-slate-900/80 z-10 flex items-center justify-center rounded-xl">
                                <div className="text-center p-4">
                                    <p className="text-secondary mb-2">Données joueurs en cours d'intégration</p>
                                    <small className="text-xs text-slate-500">Connexion API FBref requise</small>
                                </div>
                            </div>
                            <PlayerStats players={PLAYERS_DATA} homeTeam={selectedMatch.homeTeam} awayTeam={selectedMatch.awayTeam} />
                        </div>
                        */}
                    </div>

                </div>
            </main>
        </div>
    );
}

export default App;
