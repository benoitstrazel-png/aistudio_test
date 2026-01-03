
import React, { useState } from 'react';
import DashboardStats from './DashboardStats';
import NextMatchRadar from './NextMatchRadar';
import MatchPrediction from './MatchPrediction';
import Standings from './Standings';
import MatchHistory from './MatchHistory';
import LeagueCalendar from './LeagueCalendar';
import TeamLogo from './ui/TeamLogo';
import ExpertAnalysis from './ExpertAnalysis';
import FocusPlayers from './FocusPlayers';
import BettingSimulator from './BettingSimulator';
import { predictMatchLive } from '../utils/prediction';

const Dashboard = ({
    APP_DATA,
    TEAM_STATS,
    selectedMatch,
    setSelectedMatch,
    currentViewWeek,
    setCurrentViewWeek,
    teams,
    calibration,
    handleTeamChange,
    handleSwapTeams
}) => {
    return (
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

            {/* 4. BETTING SIMULATOR (FULL WIDTH) */}
            <section className="mb-16">
                <BettingSimulator matches={APP_DATA.fullSchedule.filter(m => m.week === currentViewWeek)} />
            </section>

            {/* 4. EXPERT / ACTU */}
            <div className="mt-12">
                <ExpertAnalysis nextMatches={APP_DATA.nextMatches} />
            </div>
        </>
    );
};

export default Dashboard;
