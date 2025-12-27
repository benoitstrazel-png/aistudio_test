// Vercel deploy trigger
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
import ExpertAnalysis from './components/ExpertAnalysis';
import FocusPlayers from './components/FocusPlayers';
import { getLeagueLogo } from './utils/logos';
import ClubComparator from './components/ClubComparator';
import BettingSimulator from './components/BettingSimulator';
import PlayerFocus from './components/PlayerFocus';

// Load JSON directly (Vite supports this)
import APP_DATA from './data/app_data.json';
import PLAYERS_DATA from './data/players.json';

// Fallback stats if needed
const TEAM_STATS = APP_DATA.teamStats || {};

import { predictMatchLive } from './utils/prediction';

function App() {
    // Auth State - Removed
    const [activeTab, setActiveTab] = useState('dashboard');

    // Default to first match or mock
    const [selectedMatch, setSelectedMatch] = useState(APP_DATA.nextMatches[0] || {});
    // Shared state for Calendar and Standings view
    const [currentViewWeek, setCurrentViewWeek] = useState(APP_DATA.currentWeek + 1);

    // Dynamically derive teams from the schedule to ensure 100% consistency with data
    const [teams, setTeams] = useState([]);

    useEffect(() => {
        if (APP_DATA.fullSchedule && APP_DATA.fullSchedule.length > 0) {
            const uniqueTeams = new Set();
            APP_DATA.fullSchedule.forEach(match => {
                if (match.homeTeam) uniqueTeams.add(match.homeTeam);
                if (match.awayTeam) uniqueTeams.add(match.awayTeam);
            });
            setTeams(Array.from(uniqueTeams).sort());
        }
    }, []);

    // AUTH GATE - Removed

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

            {/* TABS */}
            <div className="flex justify-center gap-4 mb-10">
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-accent text-slate-900' : 'bg-white/5 text-secondary hover:text-white'}`}
                >
                    Tableau de Bord
                </button>
                <button
                    onClick={() => setActiveTab('comparator')}
                    className={`px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'comparator' ? 'bg-accent text-slate-900' : 'bg-white/5 text-secondary hover:text-white'}`}
                >
                    Comparateur Clubs
                </button>
                <button
                    onClick={() => setActiveTab('players')}
                    className={`px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'players' ? 'bg-accent text-slate-900' : 'bg-white/5 text-secondary hover:text-white'}`}
                >
                    Focus Joueurs
                </button>
            </div>

            <main className="grid grid-cols-1 gap-16">
                {activeTab === 'dashboard' && (
                    <>
                        {/* 1. SECTION STATS */}
                        <section className="mb-12">
                            <div className="flex flex-col items-center mb-8 text-center">
                                <h2 className="text-3xl font-black text-accent tracking-tight mb-2">📊 STATISTIQUES SAISON</h2>
                                <p className="text-secondary text-sm font-medium uppercase tracking-widest">Moyennes globales de la ligue</p>
                            </div>
                            <DashboardStats
                                stats={APP_DATA.seasonStats}
                                schedule={APP_DATA.fullSchedule}
                                currentWeek={APP_DATA.currentWeek}
                                teamStats={TEAM_STATS}
                            />
                        </section>

                        {/* 2. SECTION ANALYSE (FULL WIDTH) */}
                        <section className="mb-16">
                            <div className="flex flex-col items-center mb-10 text-center">
                                <h2 className="text-3xl font-black text-accent tracking-tight mb-2">🧠 CENTRE D'ANALYSE</h2>
                                <p className="text-secondary text-sm font-medium uppercase tracking-widest">Simulateur de match et analyse détaillée</p>
                            </div>

                            <div className="card border-t-4 border-accent bg-[#0B1426]">
                                {/* SELECTOR ROW (Centered) */}
                                <div className="flex flex-row items-center justify-center gap-4 md:gap-12 mb-12 bg-black/20 p-6 rounded-2xl border border-white/5 overflow-x-auto">
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

                                {/* MAIN ANALYIS GRID: LEFT (PRED+RADAR) VS RIGHT (HISTORY) */}
                                <div className="grid xl:grid-cols-12 gap-8">

                                    {/* LEFT: Prediction & Radar */}
                                    <div className="xl:col-span-7 flex flex-col gap-6">
                                        <div className="grid md:grid-cols-2 gap-6 h-full">
                                            <MatchPrediction match={selectedMatch} />
                                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center justify-center">
                                                <NextMatchRadar homeTeam={selectedMatch.homeTeam} awayTeam={selectedMatch.awayTeam} teamStats={TEAM_STATS} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* RIGHT: History */}
                                    <div className="xl:col-span-5 border-l border-white/5 pl-0 xl:pl-8 pt-8 xl:pt-0">
                                        <MatchHistory match={selectedMatch} />
                                    </div>

                                </div>
                            </div>
                        </section>

                        {/* FOCUS PLAYERS (Full Width) */}
                        <div className="mb-16">
                            <FocusPlayers homeTeam={selectedMatch.homeTeam} awayTeam={selectedMatch.awayTeam} />
                        </div>

                        {/* 3. THREE COLUMNS: CALENDAR, BETTING, STANDINGS */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-16 items-start">

                            {/* COL 1: CALENDAR */}
                            <section>
                                <div className="flex flex-col items-center mb-8 text-center">
                                    <h2 className="text-2xl font-black text-accent tracking-tight mb-2">📅 CALENDRIER</h2>
                                </div>
                                <LeagueCalendar
                                    schedule={APP_DATA.fullSchedule}
                                    selectedWeek={currentViewWeek}
                                    onWeekChange={setCurrentViewWeek}
                                    highlightTeams={[selectedMatch.homeTeam, selectedMatch.awayTeam]}
                                />
                            </section>



                            {/* COL 3: STANDINGS */}
                            <section>
                                <div className="flex flex-col items-center mb-8 text-center">
                                    <h2 className="text-2xl font-black text-accent tracking-tight mb-2">🏆 CLASSEMENT</h2>
                                </div>
                                <Standings
                                    standings={APP_DATA.standings}
                                    schedule={APP_DATA.fullSchedule}
                                    currentWeek={APP_DATA.currentWeek}
                                    selectedWeek={currentViewWeek}
                                    onWeekChange={setCurrentViewWeek}
                                    highlightTeams={[selectedMatch.homeTeam, selectedMatch.awayTeam]}
                                />
                            </section>
                        </div>

                        {/* 4. EXPERT / ACTU */}
                        <div className="mt-12">
                            <ExpertAnalysis nextMatches={APP_DATA.nextMatches} />
                        </div>
                    </>
                )}

                {activeTab === 'comparator' && (
                    <ClubComparator
                        teams={teams}
                        schedule={APP_DATA.fullSchedule}
                        teamStats={TEAM_STATS}
                        currentWeek={APP_DATA.currentWeek}
                    />
                )}

                {activeTab === 'players' && (
                    <PlayerFocus />
                )}
            </main>
        </div>
    );
}

export default App;
