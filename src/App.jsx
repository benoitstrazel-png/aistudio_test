import React, { useState, useEffect } from 'react';
import DashboardStats from './components/DashboardStats';
import NextMatchRadar from './components/NextMatchRadar';
import MatchPrediction from './components/MatchPrediction';
import Standings from './components/Standings';
import PlayerStats from './components/PlayerStats';
import MatchHistory from './components/MatchHistory';
import { MOCK_DATA, TEAM_STATS } from './data/mockData';

function App() {
    const [selectedMatch, setSelectedMatch] = useState(MOCK_DATA.nextMatches[0]);

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
                    <DashboardStats stats={MOCK_DATA.seasonStats} />
                </section>

                {/* Main Content Grid */}
                <div className="grid md:grid-cols-2 gap-4">

                    {/* Left Column: Match Focus */}
                    <div className="flex flex-col gap-4">
                        <div className="card">
                            <h2 className="text-accent">Prochain Match</h2>
                            {/* Selector for other matches could go here */}
                            <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{selectedMatch.homeTeam}</span>
                                <span className="text-secondary">vs</span>
                                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{selectedMatch.awayTeam}</span>
                            </div>

                            <MatchPrediction match={selectedMatch} />
                        </div>

                        <NextMatchRadar homeTeam={selectedMatch.homeTeam} awayTeam={selectedMatch.awayTeam} teamStats={TEAM_STATS} />

                        <MatchHistory match={selectedMatch} />
                    </div>

                    {/* Right Column: League Info & Players */}
                    <div className="flex flex-col gap-4">
                        <Standings standings={MOCK_DATA.standings} />
                        <PlayerStats players={MOCK_DATA.players} homeTeam={selectedMatch.homeTeam} awayTeam={selectedMatch.awayTeam} />
                    </div>

                </div>
            </main>
        </div>
    );
}

export default App;
