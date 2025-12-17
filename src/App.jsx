import React, { useState, useEffect } from 'react';
import DashboardStats from './components/DashboardStats';
import NextMatchRadar from './components/NextMatchRadar';
import MatchPrediction from './components/MatchPrediction';
import Standings from './components/Standings';
import PlayerStats from './components/PlayerStats';
import MatchHistory from './components/MatchHistory';
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
                    <h1 className="text-accent">Ligue 1 <span className="text-secondary" style={{ fontSize: '0.6em' }}>Live Predictor</span></h1>
                    <p className="text-secondary">Saison 2025-2026</p>
                </div>
            </header>

            <main className="grid grid-cols-1 gap-4">
                {/* Top Stats Row */}
                <section>
                    <DashboardStats stats={APP_DATA.seasonStats} />
                </section>

                {/* Main Content Grid */}
                <div className="grid md:grid-cols-2 gap-4">

                    {/* Left Column: Match Focus */}
                    <div className="flex flex-col gap-4">
                        <div className="card">
                            <h2 className="text-accent">Simulateur de Match</h2>

                            <div className="flex justify-between items-center gap-4 mb-4">
                                <select
                                    className="p-2 rounded bg-slate-700 text-white w-full"
                                    value={selectedMatch.homeTeam}
                                    onChange={(e) => handleTeamChange('home', e.target.value)}
                                >
                                    {teams.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <span className="text-secondary font-bold">VS</span>
                                <select
                                    className="p-2 rounded bg-slate-700 text-white w-full"
                                    value={selectedMatch.awayTeam}
                                    onChange={(e) => handleTeamChange('away', e.target.value)}
                                >
                                    {teams.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>

                            <MatchPrediction match={selectedMatch} />
                        </div>

                        <NextMatchRadar homeTeam={selectedMatch.homeTeam} awayTeam={selectedMatch.awayTeam} teamStats={TEAM_STATS} />

                        <MatchHistory match={selectedMatch} />
                    </div>

                    {/* Right Column: League Info & Players */}
                    <div className="flex flex-col gap-4">
                        <Standings
                            standings={APP_DATA.standings}
                            matches={APP_DATA.matchesPlayed}
                            currentWeek={APP_DATA.currentWeek}
                        />
                        <PlayerStats players={PLAYERS_DATA} homeTeam={selectedMatch.homeTeam} awayTeam={selectedMatch.awayTeam} />
                    </div>

                </div>
            </main>
        </div>
    );
}

export default App;
