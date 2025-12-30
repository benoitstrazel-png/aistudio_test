// Vercel deploy trigger
import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard'; // Extracted Component
import ClubComparator from './components/ClubComparator';
import PlayerFocus from './components/PlayerFocus';
import ClubAnalysis from './components/ClubAnalysis';
import ForecastReview from './components/ForecastReview';
import { getLeagueLogo } from './utils/logos';
import { Analytics } from "@vercel/analytics/react";

// Load JSON directly (Vite supports this)
import APP_DATA from './data/app_data.json';
import PLAYERS_DATA from './data/players.json';

// Fallback stats if needed
const TEAM_STATS = APP_DATA.teamStats || {};

import { predictMatchLive } from './utils/prediction';
import { calculateCalibration } from './utils/calibration';

function App() {
    // Shared State
    // Default to first match or mock
    const [selectedMatch, setSelectedMatch] = useState(APP_DATA.nextMatches[0] || {});
    // Shared state for Calendar and Standings view (passed to Dashboard)
    const [currentViewWeek, setCurrentViewWeek] = useState(APP_DATA.currentWeek + 1);

    // Dynamically derive teams from the schedule to ensure 100% consistency with data
    const [teams, setTeams] = useState([]);
    const [calibration, setCalibration] = useState({});

    useEffect(() => {
        if (APP_DATA.fullSchedule && APP_DATA.fullSchedule.length > 0) {
            const uniqueTeams = new Set();
            APP_DATA.fullSchedule.forEach(match => {
                if (match.homeTeam) uniqueTeams.add(match.homeTeam);
                if (match.awayTeam) uniqueTeams.add(match.awayTeam);
            });
            setTeams(Array.from(uniqueTeams).sort());

            // Compute Calibration from History
            const factors = calculateCalibration(APP_DATA.fullSchedule, TEAM_STATS);
            setCalibration(factors);
            console.log("Calibration Factors:", factors);
        }
    }, []);

    const handleTeamChange = (type, teamName) => {
        const newMatch = { ...selectedMatch };

        if (type === 'home') {
            newMatch.homeTeam = teamName;
            if (newMatch.awayTeam === teamName) {
                newMatch.awayTeam = teams.find(t => t !== teamName) || 'Marseille';
            }
        }
        if (type === 'away') {
            newMatch.awayTeam = teamName;
            if (newMatch.homeTeam === teamName) {
                newMatch.homeTeam = teams.find(t => t !== teamName) || 'PSG';
            }
        }

        // Re-calculate prediction
        const pred = predictMatchLive(newMatch.homeTeam, newMatch.awayTeam, TEAM_STATS, calibration);
        newMatch.prediction = pred;

        // Update odds roughly based on conf (optional logic)
        newMatch.odds = {
            home: (3 - (pred.confidence / 100) * 2).toFixed(2),
            draw: 3.50,
            away: (3 + (pred.confidence / 100)).toFixed(2)
        };

        setSelectedMatch(newMatch);
    };

    const handleSwapTeams = () => {
        const newMatch = { ...selectedMatch };
        const temp = newMatch.homeTeam;
        newMatch.homeTeam = newMatch.awayTeam;
        newMatch.awayTeam = temp;

        // Re-calculate prediction
        const pred = predictMatchLive(newMatch.homeTeam, newMatch.awayTeam, TEAM_STATS, calibration);
        newMatch.prediction = pred;

        // Update odds
        newMatch.odds = {
            home: (3 - (pred.confidence / 100) * 2).toFixed(2),
            draw: 3.50,
            away: (3 + (pred.confidence / 100)).toFixed(2)
        };

        setSelectedMatch(newMatch);
    };

    const navLinkClass = ({ isActive }) =>
        `px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest transition-all ${isActive ? 'bg-accent text-slate-900' : 'bg-white/5 text-secondary hover:text-white'}`;

    return (
        <div className="container min-h-screen pb-12">

            {/* BRAND HEADER with L1 Logo */}
            <header className="flex flex-col items-center justify-center pt-10 pb-8 mb-12 border-b border-white/5">
                <div className="flex flex-col items-center gap-6">
                    <img
                        src={getLeagueLogo()}
                        alt="Ligue 1"
                        className="object-contain drop-shadow-[0_0_20px_rgba(206,240,2,0.6)] bg-white/90 rounded-2xl p-2"
                        style={{ height: '60px', width: 'auto' }}
                    />
                    <div className="text-center">
                        <h1 className="text-4xl font-black text-white m-0 tracking-tighter uppercase italic mb-2">
                            Ligue 1 <span className="text-accent not-italic">Sim</span> <span className="text-sm not-italic text-slate-500">v1.3</span>
                        </h1>
                        <p className="text-secondary text-lg font-bold tracking-[0.2em] uppercase">Saison 2025-2026</p>
                    </div>
                </div>
            </header>

            {/* TABS (Navigation) */}
            <nav className="flex justify-center gap-4 mb-10 flex-wrap">
                <NavLink to="/main" className={navLinkClass}>
                    Tableau de Bord
                </NavLink>
                <NavLink to="/comparator" className={navLinkClass}>
                    Comparateur Clubs
                </NavLink>
                <NavLink to="/players" className={navLinkClass}>
                    Focus Joueurs
                </NavLink>
                <NavLink to="/club" className={navLinkClass}>
                    Focus Club
                </NavLink>
                <NavLink to="/forecasts" className={navLinkClass}>
                    Prévisions vs Réel
                </NavLink>
            </nav>

            <main className="grid grid-cols-1 gap-16">
                <Routes>
                    <Route path="/" element={<Navigate to="/main" replace />} />

                    <Route path="/main" element={
                        <Dashboard
                            APP_DATA={APP_DATA}
                            TEAM_STATS={TEAM_STATS}
                            selectedMatch={selectedMatch}
                            setSelectedMatch={setSelectedMatch}
                            currentViewWeek={currentViewWeek}
                            setCurrentViewWeek={setCurrentViewWeek}
                            teams={teams}
                            calibration={calibration}
                            handleTeamChange={handleTeamChange}
                            handleSwapTeams={handleSwapTeams}
                        />
                    } />

                    <Route path="/comparator" element={
                        <ClubComparator
                            teams={teams}
                            schedule={APP_DATA.fullSchedule}
                            teamStats={TEAM_STATS}
                            currentWeek={APP_DATA.currentWeek}
                        />
                    } />

                    <Route path="/players" element={<PlayerFocus />} />

                    <Route path="/club" element={
                        <ClubAnalysis
                            teams={teams}
                            teamStats={TEAM_STATS}
                            schedule={APP_DATA.fullSchedule}
                            playerData={PLAYERS_DATA}
                        />
                    } />

                    <Route path="/forecasts" element={
                        <ForecastReview
                            schedule={APP_DATA.fullSchedule}
                            currentWeek={APP_DATA.currentWeek}
                        />
                    } />
                </Routes>
            </main>
            <Analytics />
        </div>
    );
}

export default App;
