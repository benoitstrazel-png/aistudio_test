import React, { useState, useEffect } from 'react';
import DashboardStats from './components/DashboardStats';
import NextMatchRadar from './components/NextMatchRadar';
import MatchPrediction from './components/MatchPrediction';
import Standings from './components/Standings';
import PlayerStats from './components/PlayerStats';
import MatchHistory from './components/MatchHistory';
import LeagueCalendar from './components/LeagueCalendar';
import InfoTooltip from './components/ui/InfoTooltip';
import TeamLogo from './components/ui/TeamLogo'; // New Component
import AuthPage from './components/AuthPage';
import ExpertAnalysis from './components/ExpertAnalysis';
import FocusPlayers from './components/FocusPlayers';
import { getLeagueLogo } from './utils/logos';

// Load JSON directly (Vite supports this)
import APP_DATA from './data/app_data.json';
import PLAYERS_DATA from './data/players.json';

// Fallback stats if needed
const TEAM_STATS = APP_DATA.teamStats || {};

import { predictMatchLive } from './utils/prediction';

function App() {
    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Default to first match or mock
    const [selectedMatch, setSelectedMatch] = useState(APP_DATA.nextMatches[0] || {});
    // List of strict 18 teams for 2025-2026 Season
    const L1_TEAMS_2025 = [
        "Angers", "Auxerre", "Brest", "Le Havre", "Lens", "Lille",
        "Lorient", "Lyon", "Marseille", "Metz", "Monaco", "Montpellier",
        "Nantes", "Nice", "PSG", "Reims", "Rennes", "Saint-Etienne", "Strasbourg", "Toulouse"
    ].sort();

    const [teams, setTeams] = useState(L1_TEAMS_2025);

    useEffect(() => {
        // Enforce strict L1 Team list
        setTeams(L1_TEAMS_2025);
    }, []);

    // AUTH GATE
    if (!isAuthenticated) {
        return <AuthPage onLogin={() => setIsAuthenticated(true)} />;
    }

    const handleTeamChange = (type, teamName) => {
        const newMatch = { ...selectedMatch };

        if (type === 'home') {
            newMatch.homeTeam = teamName;
            // If selecting the team currently set as Away, change Away
            if (newMatch.awayTeam === teamName) {
                newMatch.awayTeam = teams.find(t => t !== teamName) || 'Marseille';
            }
        }
        if (type === 'away') {
            newMatch.awayTeam = teamName;
            // If selecting the team currently set as Home, change Home
            if (newMatch.homeTeam === teamName) {
                newMatch.homeTeam = teams.find(t => t !== teamName) || 'PSG';
            }
        }

        // Re-calculate prediction
        const pred = predictMatchLive(newMatch.homeTeam, newMatch.awayTeam, TEAM_STATS);
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
        const pred = predictMatchLive(newMatch.homeTeam, newMatch.awayTeam, TEAM_STATS);
        newMatch.prediction = pred;

        // Update odds
        newMatch.odds = {
            home: (3 - (pred.confidence / 100) * 2).toFixed(2),
            draw: 3.50,
            away: (3 + (pred.confidence / 100)).toFixed(2)
        };

        setSelectedMatch(newMatch);
    };

    return (
        <div className="container min-h-screen pb-12">

            {/* BRAND HEADER with L1 Logo */}
            <header className="flex justify-between items-end pt-8 pb-4 mb-4 border-b border-white/5">
                <div className="flex items-center gap-4">
                    <img
                        src={getLeagueLogo()}
                        alt="Ligue 1"
                        className="object-contain drop-shadow-[0_0_15px_rgba(206,240,2,0.5)] bg-white/90 rounded-xl p-1"
                        style={{ height: '40px', width: 'auto' }}
                    />
                    <div>
                        <h1 className="text-2xl font-black text-white m-0 tracking-tighter uppercase italic">
                            Ligue 1 <span className="text-accent not-italic">Sim</span>
                        </h1>
                        <p className="text-secondary text-sm font-bold tracking-widest uppercase">Saison 2025-2026</p>
                    </div>
                </div>
            </header>

            <main className="grid grid-cols-1 gap-12">

                {/* 1. SECTION STATS */}
                <section>
                    <div className="section-title text-accent">
                        <span>📊 Statistiques Saison</span>
                        <InfoTooltip text="Moyennes globales de la ligue." />
                    </div>
                    <DashboardStats
                        stats={APP_DATA.seasonStats}
                        schedule={APP_DATA.fullSchedule}
                        currentWeek={APP_DATA.currentWeek}
                        teamStats={APP_DATA.teamStats}
                    />
                </section>

                <div className="grid lg:grid-cols-12 gap-8">

                    {/* LEFT COLUMN */}
                    <div className="lg:col-span-8 flex flex-col gap-12">

                        {/* 2. SECTION ANALYSE */}
                        <section>
                            <div className="section-title text-accent">
                                <span>🧠 Centre d'Analyse</span>
                                <InfoTooltip text="Simulateur de match et analyse détaillée." />
                            </div>

                            <div className="card border-t-4 border-accent bg-[#0B1426]">
                                {/* SELECTORS with Logos */}
                                <div className="flex flex-row items-center justify-between gap-4 md:gap-12 mb-8 bg-black/20 p-6 rounded-2xl border border-white/5 overflow-x-auto">
                                    <div className="flex items-center gap-3 shrink-0">
                                        <TeamLogo teamName={selectedMatch.homeTeam} size="lg" />
                                        <div className="flex flex-col">
                                            <label className="text-[10px] text-accent font-bold uppercase tracking-widest mb-1 block">Domicile</label>
                                            <select
                                                className="bg-slate-800 text-white p-2 rounded w-32 md:w-48 text-sm md:text-base font-bold border border-white/10 focus:border-accent outline-none cursor-pointer"
                                                value={selectedMatch.homeTeam}
                                                onChange={(e) => handleTeamChange('home', e.target.value)}
                                            >
                                                {teams.filter(t => t !== selectedMatch.awayTeam).map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center shrink-0 px-2">
                                        <div className="font-black text-2xl md:text-3xl italic text-white/20">VS</div>
                                        <button
                                            onClick={handleSwapTeams}
                                            className="mt-2 p-1.5 rounded-full bg-white/5 hover:bg-accent/20 text-secondary hover:text-accent transition-all active:scale-95 group"
                                            title="Intervertir domicile/extérieur"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-180 transition-transform duration-500">
                                                <path d="M20 17H4" />
                                                <path d="M4 17l4-4" />
                                                <path d="m8 21-4-4" />
                                                <path d="M4 7h16" />
                                                <path d="M20 7l-4-4" />
                                                <path d="m16 11 4-4" />
                                            </svg>
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-3 flex-row-reverse text-right shrink-0">
                                        <TeamLogo teamName={selectedMatch.awayTeam} size="lg" />
                                        <div className="flex flex-col items-end">
                                            <label className="text-[10px] text-red-500 font-bold uppercase tracking-widest mb-1 block">Extérieur</label>
                                            <select
                                                className="bg-slate-800 text-white p-2 rounded w-32 md:w-48 text-sm md:text-base font-bold border border-white/10 focus:border-accent outline-none cursor-pointer"
                                                value={selectedMatch.awayTeam}
                                                onChange={(e) => handleTeamChange('away', e.target.value)}
                                            >
                                                {teams.filter(t => t !== selectedMatch.homeTeam).map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-8 mb-8">
                                    <MatchPrediction match={selectedMatch} />
                                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                        <NextMatchRadar homeTeam={selectedMatch.homeTeam} awayTeam={selectedMatch.awayTeam} teamStats={TEAM_STATS} />
                                    </div>
                                </div>

                                <div className="border-t border-white/10 pt-6">
                                    <MatchHistory match={selectedMatch} />
                                </div>
                            </div>
                        </section>

                        {/* NEW: FOCUS PLAYERS Section */}
                        <FocusPlayers homeTeam={selectedMatch.homeTeam} awayTeam={selectedMatch.awayTeam} />

                        {/* 3. SECTION CALENDRIER */}
                        <section>
                            <div className="section-title text-accent">
                                <span>📅 Calendrier</span>
                            </div>
                            <LeagueCalendar
                                schedule={APP_DATA.fullSchedule || []}
                                currentWeek={APP_DATA.currentWeek}
                                highlightTeams={[selectedMatch.homeTeam, selectedMatch.awayTeam]}
                            />
                        </section>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="lg:col-span-4 flex flex-col gap-12">

                        {/* 4. SECTION CLASSEMENT */}
                        <section>
                            <div className="section-title text-accent">
                                <span>🏆 Classement</span>
                            </div>
                            <Standings
                                standings={APP_DATA.standings}
                                schedule={APP_DATA.fullSchedule}
                                currentWeek={APP_DATA.currentWeek}
                                highlightTeams={[selectedMatch.homeTeam, selectedMatch.awayTeam]}
                            />
                        </section>
                    </div>

                </div>

                <div className="mt-12">
                    <ExpertAnalysis nextMatches={APP_DATA.nextMatches} />
                </div>
            </main>
        </div>
    );
}

export default App;
