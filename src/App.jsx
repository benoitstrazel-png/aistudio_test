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
import { getLeagueLogo } from './utils/logos';

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

        // Update odds roughly based on conf (optional logic)
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
                    <img src={getLeagueLogo()} alt="Ligue 1" className="h-10 w-auto object-contain drop-shadow-[0_0_15px_rgba(206,240,2,0.5)] bg-white/90 rounded-xl p-1" />
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
                    <DashboardStats stats={APP_DATA.seasonStats} />
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
                                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 bg-black/20 p-6 rounded-2xl border border-white/5">
                                    <div className="w-full flex items-center gap-3">
                                        <TeamLogo teamName={selectedMatch.homeTeam} size="md" />
                                        <div className="w-full">
                                            <label className="text-[10px] text-accent font-bold uppercase tracking-widest mb-1 block">Domicile</label>
                                            <select
                                                className="w-full text-lg"
                                                value={selectedMatch.homeTeam}
                                                onChange={(e) => handleTeamChange('home', e.target.value)}
                                            >
                                                {teams.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="font-black text-3xl italic text-white/20">VS</div>

                                    <div className="w-full flex items-center gap-3 flex-row-reverse md:flex-row">
                                        <div className="w-full text-right md:text-left">
                                            <label className="text-[10px] text-accent font-bold uppercase tracking-widest mb-1 block">Extérieur</label>
                                            <select
                                                className="w-full text-lg"
                                                value={selectedMatch.awayTeam}
                                                onChange={(e) => handleTeamChange('away', e.target.value)}
                                            >
                                                {teams.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <TeamLogo teamName={selectedMatch.awayTeam} size="md" />
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
            </main>
        </div>
    );
}

export default App;
