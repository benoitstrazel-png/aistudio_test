import React, { useMemo } from 'react';
import { getPlayerPhoto } from '../utils/playerPhotos';
import { PLAYERS_DB } from '../data/players_static';
import ALL_LINEUPS from '../data/lineups_2025_2026.json';

const PitchMap = ({ clubName, roster, stats }) => {

    // --- FORMATION COORDINATES DEFINITIONS ---
    const FORMATION_COORDS = {
        "4-3-3": {
            G: [{ top: 88, left: 50 }],
            D: [{ top: 68, left: 15 }, { top: 68, left: 38 }, { top: 68, left: 62 }, { top: 68, left: 85 }],
            M: [{ top: 48, left: 20 }, { top: 48, left: 50 }, { top: 48, left: 80 }],
            A: [{ top: 18, left: 20 }, { top: 18, left: 50 }, { top: 18, left: 80 }]
        },
        "4-4-2": {
            G: [{ top: 88, left: 50 }],
            D: [{ top: 68, left: 15 }, { top: 68, left: 38 }, { top: 68, left: 62 }, { top: 68, left: 85 }],
            M: [{ top: 40, left: 15 }, { top: 48, left: 38 }, { top: 48, left: 62 }, { top: 40, left: 85 }],
            A: [{ top: 18, left: 35 }, { top: 18, left: 65 }]
        },
        "4-2-3-1": {
            G: [{ top: 88, left: 50 }],
            D: [{ top: 68, left: 15 }, { top: 68, left: 38 }, { top: 68, left: 62 }, { top: 68, left: 85 }],
            M: [
                { top: 52, left: 35 }, { top: 52, left: 65 }, // CDMs
                { top: 30, left: 20 }, { top: 30, left: 50 }, { top: 30, left: 80 } // AMs
            ],
            A: [{ top: 12, left: 50 }]
        },
        "3-5-2": {
            G: [{ top: 88, left: 50 }],
            D: [{ top: 68, left: 25 }, { top: 68, left: 50 }, { top: 68, left: 75 }],
            M: [
                { top: 50, left: 10 }, { top: 50, left: 90 }, // Wingbacks
                { top: 50, left: 35 }, { top: 45, left: 50 }, { top: 50, left: 65 } // Central Mids
            ],
            A: [{ top: 18, left: 35 }, { top: 18, left: 65 }]
        },
        "3-4-3": {
            G: [{ top: 88, left: 50 }],
            D: [{ top: 68, left: 25 }, { top: 68, left: 50 }, { top: 68, left: 75 }],
            M: [{ top: 45, left: 15 }, { top: 45, left: 38 }, { top: 45, left: 62 }, { top: 45, left: 85 }],
            A: [{ top: 18, left: 20 }, { top: 18, left: 50 }, { top: 18, left: 80 }]
        },
        "5-4-1": {
            G: [{ top: 88, left: 50 }],
            D: [{ top: 70, left: 10 }, { top: 70, left: 30 }, { top: 70, left: 50 }, { top: 70, left: 70 }, { top: 70, left: 90 }],
            M: [{ top: 50, left: 20 }, { top: 50, left: 40 }, { top: 50, left: 60 }, { top: 50, left: 80 }],
            A: [{ top: 15, left: 50 }]
        },
        // 4-1-4-1 (Mapped as M=5, A=1)
        "4-1-4-1": {
            G: [{ top: 88, left: 50 }],
            D: [{ top: 70, left: 15 }, { top: 70, left: 38 }, { top: 70, left: 62 }, { top: 70, left: 85 }],
            M: [
                { top: 55, left: 50 }, // DM
                { top: 38, left: 15 }, { top: 38, left: 38 }, { top: 38, left: 62 }, { top: 38, left: 85 } // 4 AMs
            ],
            A: [{ top: 15, left: 50 }]
        },
        // 3-4-2-1 (Mapped as M=6, A=1)
        "3-4-2-1": {
            G: [{ top: 88, left: 50 }],
            D: [{ top: 72, left: 25 }, { top: 72, left: 50 }, { top: 72, left: 75 }],
            M: [
                // 4 Mids (Wingbacks + CMs)
                { top: 55, left: 10 }, { top: 55, left: 35 }, { top: 55, left: 65 }, { top: 55, left: 90 },
                // 2 AMs (Categorized as M by parser)
                { top: 35, left: 30 }, { top: 35, left: 70 }
            ],
            A: [{ top: 15, left: 50 }]
        },
        // Fallback or mapped types
        "5-3-2": "3-5-2",
        "5-2-3": "3-4-3",
        "3-4-1-2": "3-5-2", // M=5, A=2
        "4-5-1": "4-1-4-1" // Use the same layout
    };

    const getCoords = (formation, pos, index, total) => {
        let layoutName = formation;
        // Handle aliases
        if (typeof FORMATION_COORDS[formation] === 'string') {
            layoutName = FORMATION_COORDS[formation];
        }
        // Fallback to 4-3-3 if unknown
        if (!FORMATION_COORDS[layoutName]) layoutName = "4-3-3";

        const scheme = FORMATION_COORDS[layoutName];
        const posGroup = scheme[pos];
        if (!posGroup) return { top: 50, left: 50 };

        // Safety: if we have more players than slots (e.g. backfill), distribute evenly
        if (index >= posGroup.length) {
            const step = 100 / (total + 1);
            return {
                top: pos === 'G' ? 88 : pos === 'D' ? 68 : pos === 'M' ? 48 : 18,
                left: step * (index + 1)
            };
        }

        return posGroup[index];
    };

    // 1. Filter roster by position AND "Apps in Lineup" rule
    const { team, dominantFormation, startsMap } = useMemo(() => {
        const safeRoster = roster || [];
        const norm = (str) => str?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() || "";

        // Helper: Strict token matching
        const namesMatch = (n1, n2) => {
            if (!n1 || !n2) return false;
            if (n1 === n2) return true;
            // Split into significant tokens (ignoring single letters like "J.")
            const t1 = n1.split(' ').filter(x => x.length > 1);
            const t2 = n2.split(' ').filter(x => x.length > 1);

            // If one name is short (e.g. "Castillo"), check if it's contained in the other tokens
            // Ensure we match at least one significant part (e.g. "Castillo" in "Del Castillo")
            return t1.some(a => t2.some(b => b === a || (b.includes(a) && a.length > 3) || (a.includes(b) && b.length > 3)));
        };

        // A. ANALYZE LINEUPS (Starts Count & Formation)
        const startsCount = new Map();
        const activePlayerNames = new Set();
        const formationFreq = {};
        let targetMatch = null;
        let targetSide = null; // 'home' or 'away'

        ALL_LINEUPS.forEach(match => {
            const homeNorm = norm(match.teams.home);
            const awayNorm = norm(match.teams.away);
            const clubNorm = norm(clubName);

            let isHome = homeNorm.includes(clubNorm);
            let isAway = awayNorm.includes(clubNorm);

            if (isHome || isAway) {
                if (!targetMatch) {
                    targetMatch = match;
                    targetSide = isHome ? 'home' : 'away';
                }

                const side = isHome ? 'home' : 'away';
                const starters = side === 'home' ? match.lineups.homeStarters : match.lineups.awayStarters;
                const formation = side === 'home' ? match.lineups.homeFormation : match.lineups.awayFormation;

                // Track Formation
                if (formation) {
                    formationFreq[formation] = (formationFreq[formation] || 0) + 1;
                }

                // Track Starts
                starters.forEach(name => {
                    const n = norm(name.replace(/\(.*\)/g, '')).trim();
                    activePlayerNames.add(n);
                    startsCount.set(n, (startsCount.get(n) || 0) + 1);
                });

                // Track Subs (Active Names only)
                const subs = side === 'home' ? match.lineups.homeSubstitutes : match.lineups.awaySubstitutes;
                subs.forEach(name => {
                    const n = norm(name.replace(/\(.*\)/g, '')).trim();
                    activePlayerNames.add(n);
                });
            }
        });

        // Pick Dominant Formation
        let topFormation = "4-3-3";
        let maxCount = 0;
        for (const [fmt, cnt] of Object.entries(formationFreq)) {
            if (cnt > maxCount) {
                maxCount = cnt;
                topFormation = fmt;
            }
        }

        // B. TRANSIENT PLAYER GENERATION (Only if needed)
        const transientPlayers = [];
        const EXCLUSIONS = {
            'Stade Brestois 29': ['Pierre Lees-Melou', 'Lees-Melou'],
            'Stade Rennais Fc': ['Brice Samba']
        };
        const ALIASES = {
            'A. Sbai': 'Sbai', // Try to match "Sbai" broadly if "A. Sbai" fails
            'Doumbia K.': 'Kamory Doumbia'
        };

        if (targetMatch) {
            const startersRaw = targetSide === 'home' ? targetMatch.lineups.homeStarters : targetMatch.lineups.awayStarters;
            const formationStr = targetSide === 'home' ? targetMatch.lineups.homeFormation : targetMatch.lineups.awayFormation;

            let counts = { D: 4, M: 3, A: 3 };
            if (formationStr) {
                const parts = formationStr.split('-').map(Number);
                if (parts.length >= 3) {
                    counts.D = parts[0];
                    counts.A = parts[parts.length - 1];
                    counts.M = parts.slice(1, parts.length - 1).reduce((a, b) => a + b, 0);
                }
            }

            startersRaw.forEach((rawName, index) => {
                let cleanName = rawName.replace(/\(.*\)/g, '').trim();

                // 1. Check Aliases
                if (ALIASES[cleanName]) cleanName = ALIASES[cleanName];

                // 2. Check Exclusions
                const clubExcludes = EXCLUSIONS[clubName] || [];
                // clubName comes from props. Note: mapped name might be needed. 
                // But EXCLUSIONS keys should match what's passed in.

                // Robust exclusion check
                const isExcluded = clubExcludes.some(ex => namesMatch(norm(ex), norm(cleanName)));
                if (isExcluded) return;

                const normName = norm(cleanName);

                // Use robust matching to check if exists
                const exists = safeRoster.some(p => namesMatch(norm(p.name), normName));

                if (!exists) {
                    let position = 'M';
                    if (index === 0) position = 'G';
                    else if (index <= counts.D) position = 'D';
                    else if (index <= counts.D + counts.M) position = 'M';
                    else position = 'A';
                    if (rawName.includes('(G)')) position = 'G';

                    transientPlayers.push({
                        name: cleanName,
                        position: position,
                        rating: 6.5,
                        mj: 1,
                        isTransient: true
                    });
                }
            });
        }

        // C. MERGE & DEDUPE ROSTER
        // Prioritize SafeRoster (from DB/API) over Transient Players (from Lineups)
        const mergedList = [...safeRoster];
        transientPlayers.forEach(tp => {
            const tpNorm = norm(tp.name);
            // Robust check: match ANY existing roster player?
            const isDuplicate = safeRoster.some(rp => namesMatch(norm(rp.name), tpNorm));
            if (!isDuplicate) {
                mergedList.push(tp);
            }
        });
        const fullRoster = mergedList;


        // D. SELECT SQUAD using Dominant Formation Counts
        let targetCounts = { G: 1, D: 4, M: 3, A: 3 };
        const parts = topFormation.split('-').map(Number);
        if (parts.length >= 3) {
            targetCounts.D = parts[0];
            targetCounts.A = parts[parts.length - 1];
            targetCounts.M = parts.slice(1, parts.length - 1).reduce((a, b) => a + b, 0);
        }

        const getStartsInternal = (name, map) => {
            const n = norm(name);
            if (map.has(n)) return map.get(n);
            for (let [k, v] of map) {
                if (namesMatch(n, k)) return v;
            }
            return 0;
        };

        const selectedNames = new Set();

        const getBest = (pos, count) => {
            const isActive = (pName) => {
                const normName = norm(pName);
                if (activePlayerNames.has(normName)) return true;
                for (let activeName of activePlayerNames) {
                    if (namesMatch(normName, activeName)) return true;
                }
                return false;
            };

            // 1. Get Strict matches (Starters or played games)
            let candidates = fullRoster.filter(p => {
                const n = norm(p.name);
                if (selectedNames.has(n)) return false;
                if (!isActive(p.name)) return false;

                let dbPlayer = PLAYERS_DB.find(db => namesMatch(norm(db.Player), n));
                if (dbPlayer && dbPlayer.Starts > 0 && p.position === pos) return true;
                return p.position === pos && (p.mj !== undefined && p.mj > 0);
            });

            // Sort by: 1. Starts (Lineups) → 2. Rating → 3. Goals+Assists
            candidates.sort((a, b) => {
                const sA = getStartsInternal(a.name, startsCount);
                const sB = getStartsInternal(b.name, startsCount);
                if (sA !== sB) return sB - sA;

                // If starts are equal, compare rating
                const ratingA = a.rating || 0;
                const ratingB = b.rating || 0;
                if (ratingA !== ratingB) return ratingB - ratingA;

                // If rating also equal, compare decisiveness (goals + assists)
                const { goals: gA, assists: aA } = getPlayerStats(a.name);
                const { goals: gB, assists: aB } = getPlayerStats(b.name);
                const decisiveA = (gA || 0) + (aA || 0);
                const decisiveB = (gB || 0) + (aB || 0);
                return decisiveB - decisiveA;
            });

            // 2. BACKFILL: Same position, any active player not yet picked
            if (candidates.length < count) {
                const extras = fullRoster
                    .filter(p => {
                        const n = norm(p.name);
                        return !selectedNames.has(n) &&
                            !candidates.includes(p) &&
                            p.position === pos &&
                            isActive(p.name);
                    })
                    .sort((a, b) => (b.rating || 0) - (a.rating || 0));

                candidates = [...candidates, ...extras];
            }

            // 3. ULTIMATE BACKFILL: Any active player (Out of position allowed)
            if (candidates.length < count) {
                const desperationPick = fullRoster
                    .filter(p => {
                        const n = norm(p.name);
                        return !selectedNames.has(n) &&
                            !candidates.includes(p) &&
                            isActive(p.name);
                    })
                    .sort((a, b) => (b.rating || 0) - (a.rating || 0));

                candidates = [...candidates, ...desperationPick];
            }

            // Limit and Register
            const finalSelection = candidates.slice(0, count);
            finalSelection.forEach(p => selectedNames.add(norm(p.name)));
            return finalSelection;
        };

        // Execution Order: G -> D -> M -> A (Defensive spine first)
        const team = {
            G: getBest('G', targetCounts.G),
            D: getBest('D', targetCounts.D),
            M: getBest('M', targetCounts.M),
            A: getBest('A', targetCounts.A),
        };

        return { team, dominantFormation: topFormation, startsMap: startsCount };

    }, [roster, clubName]);

    // 2. Helper to get dynamic stats
    const getPlayerStats = (name) => {
        let goals = 0;
        let assists = 0;
        // Reuse robust namesMatch from useMemo scope? No, it's inside.
        // We need to define or hoist it.
        // Let's define a local safe matcher.
        const norm = (str) => str?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() || "";

        const safeMatch = (n1, n2) => {
            if (!n1 || !n2) return false;
            // Exact match preferred
            if (n1 === n2) return true;
            // Token match
            const t1 = n1.split(' ').filter(x => x.length > 1);
            const t2 = n2.split(' ').filter(x => x.length > 1);
            // Ensure meaningful overlap
            return t1.some(a => t2.some(b => b === a));
        };

        if (stats && stats.scorers) {
            Object.entries(stats.scorers).forEach(([sName, sCount]) => {
                if (safeMatch(norm(sName), norm(name))) goals = sCount;
            });
        }
        if (stats && stats.assisters) {
            Object.entries(stats.assisters).forEach(([aName, aCount]) => {
                if (safeMatch(norm(aName), norm(name))) assists = aCount;
            });
        }
        return { goals, assists };
    };

    // Check if name is in startsMap
    const getStarts = (name) => {
        const norm = (str) => str?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() || "";
        const n = norm(name);
        const val = startsMap.get(n);
        if (val !== undefined) return val;

        // Robust match
        const namesMatch = (n1, n2) => {
            if (!n1 || !n2) return false;
            if (n1 === n2) return true;
            const t1 = n1.split(' ').filter(x => x.length > 1);
            const t2 = n2.split(' ').filter(x => x.length > 1);
            return t1.some(a => t2.some(b => b === a || (b.includes(a) && a.length > 3)));
        };

        for (let [k, v] of startsMap) {
            if (namesMatch(n, k)) return v;
        }
        return 0;
    };

    const PlayerNode = ({ player, position, index, total, formation }) => {
        const { goals, assists } = getPlayerStats(player.name);
        const starts = getStarts(player.name);
        const hasStats = goals > 0 || assists > 0;
        const photoUrl = getPlayerPhoto(clubName, player.name);

        const safeTotal = total || 1;
        const coords = getCoords(formation, position, index, safeTotal);

        // Get additional player info from DB using simplified matching
        const normalizeName = (name) => name?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() || "";
        const dbPlayer = PLAYERS_DB.find(db => {
            const dbName = normalizeName(db.Player);
            const playerName = normalizeName(player.name);
            // Try exact match first
            if (dbName === playerName) return true;
            // Try partial match (last name)
            const dbLastName = db.Player.split(' ').pop().toLowerCase();
            const playerLastName = player.name.split(' ').pop().toLowerCase();
            return dbLastName === playerLastName && dbName.includes(playerLastName);
        });

        // Smart Label Logic
        let label = player.name.split(' ').pop();
        if (label.length <= 2 && label.includes('.')) {
            label = player.name.split(' ')[0];
            if (label.length <= 2) label = player.name;
        }

        // Special case fallback: if still just initial, try to find a capitalized word > 2 chars in name
        if (label.length <= 2) {
            const manualParts = player.name.split(' ').filter(p => p.length > 2 && /^[A-Z]/.test(p));
            if (manualParts.length > 0) label = manualParts[manualParts.length - 1]; // Take last significant part
        }

        return (
            <div
                className="group cursor-pointer"
                style={{
                    position: 'absolute',
                    top: `${coords.top}%`,
                    left: `${coords.left}%`,
                    transform: 'translate(-50%, -50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 20
                }}
            >
                {/* Photo / Dot - Circle 80px */}
                <div
                    className={`relative rounded-full border flex items-center justify-center shadow-lg transition-all overflow-hidden ${hasStats ? 'border-accent scale-110' : 'border-slate-400'} bg-slate-800`}
                    style={{ width: '80px', height: '80px' }}
                >
                    {photoUrl ? (
                        <img
                            src={photoUrl}
                            alt={player.name}
                            className="w-full h-full"
                            style={{ objectFit: 'cover', objectPosition: 'top' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                    ) : (
                        <span className={`text-[10px] font-bold ${hasStats ? 'text-accent' : 'text-slate-400'}`}>
                            {player.rating}
                        </span>
                    )}
                </div>

                {/* Name Label */}
                <div className="mt-1 bg-black/70 px-2 py-0.5 rounded text-[9px] text-white font-bold whitespace-nowrap backdrop-blur-sm border border-white/20 shadow-sm">
                    {label}
                </div>

                {/* Stats Badge */}
                <div className="flex gap-1 mt-1 pointer-events-none z-20 absolute top-full pt-1">
                    {starts > 0 && (
                        <div className="bg-emerald-500/90 text-white px-1.5 py-0.5 rounded text-[8px] font-black shadow-sm">
                            👕{starts}
                        </div>
                    )}
                    {goals > 0 && (
                        <div className="bg-accent/90 text-[#0B1426] px-1.5 py-0.5 rounded text-[8px] font-black shadow-sm">
                            ⚽{goals}
                        </div>
                    )}
                    {assists > 0 && (
                        <div className="bg-blue-400/90 text-white px-1.5 py-0.5 rounded text-[8px] font-black shadow-sm">
                            🎯{assists}
                        </div>
                    )}
                </div>

                {/* Enhanced Hover Tooltip - Hidden by default with CSS */}
                <div
                    className="absolute bottom-full mb-2 z-50 pointer-events-none tooltip-content"
                    style={{ display: 'none' }}
                >
                    <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 shadow-2xl text-xs w-56">
                        {/* Player Name */}
                        <div className="font-bold text-white text-sm border-b border-white/10 pb-2 mb-2">
                            {player.name}
                        </div>

                        {/* Player Info Grid */}
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            {dbPlayer?.Age && (
                                <div className="flex justify-between text-slate-300">
                                    <span>Âge:</span>
                                    <span className="text-white font-semibold">{dbPlayer.Age} ans</span>
                                </div>
                            )}
                            {dbPlayer?.Pos && (
                                <div className="flex justify-between text-slate-300">
                                    <span>Poste:</span>
                                    <span className="text-cyan-400 font-semibold">{dbPlayer.Pos}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-slate-300">
                                <span>Note:</span>
                                <span className="text-yellow-400 font-bold">{player.rating}</span>
                            </div>
                            <div className="flex justify-between text-slate-300">
                                <span>Titularisations:</span>
                                <span className="text-emerald-400 font-semibold">{starts}</span>
                            </div>
                        </div>

                        {/* Season Stats */}
                        {(goals > 0 || assists > 0) && (
                            <div className="border-t border-white/10 pt-2 mb-2">
                                <div className="text-[10px] text-slate-400 mb-1 uppercase font-semibold">Stats Saison</div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex justify-between text-slate-300">
                                        <span>⚽ Buts:</span>
                                        <span className="text-accent font-bold">{goals}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-300">
                                        <span>🎯 Passes:</span>
                                        <span className="text-blue-400 font-bold">{assists}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Next Opponent - Placeholder for now */}
                        <div className="border-t border-white/10 pt-2 text-[10px]">
                            <div className="text-slate-400 mb-1 uppercase font-semibold">Prochain Match</div>
                            <div className="text-white">À déterminer</div>
                        </div>
                    </div>
                </div>

                {/* CSS to show tooltip on hover */}
                <style jsx>{`
                    .group:hover .tooltip-content {
                        display: block !important;
                    }
                `}</style>
            </div>
        );
    };

    return (
        <div className="card bg-[#0B1426] p-4 flex flex-col items-center h-full min-h-[500px]" >
            {/* HEADER with Formation detected */}
            < div className="flex justify-between w-full mb-4 items-center" >
                <h4 className="text-secondary text-xs uppercase font-bold">⚡ Tactique (Compo Probable)</h4>
                <span className="text-[10px] text-slate-400 font-mono border border-slate-700 px-2 py-0.5 rounded bg-black/20">
                    {dominantFormation}
                </span>
            </div >

            {/* PITCH CONTAINER */}
            < div
                className="relative w-full rounded-xl shadow-2xl select-none"
                style={{
                    position: 'relative',
                    height: '800px',
                    width: '100%',
                    background: 'linear-gradient(to bottom, #34D399, #059669)',
                    border: '4px solid white',
                    overflow: 'hidden'
                }}
            >

                {/* PITCH MARKINGS */}
                < div className="absolute top-6 left-0 w-full text-center pointer-events-none z-0" >
                    <h3 className="text-white/30 font-black text-3xl uppercase tracking-[0.2em] font-mono">COMPOS</h3>
                </div >
                <div className="absolute inset-4 rounded-sm pointer-events-none opacity-90 z-0" style={{ position: 'absolute', border: '2px solid rgba(255,255,255,0.8)' }}>
                    {/* Midline */}
                    <div className="absolute top-1/2 left-0 w-full transform -translate-y-1/2" style={{ position: 'absolute', height: '2px', backgroundColor: 'rgba(255,255,255,0.8)' }}></div>
                    {/* Center Circle */}
                    <div className="absolute top-1/2 left-1/2 w-32 h-32 rounded-full transform -translate-x-1/2 -translate-y-1/2" style={{ position: 'absolute', border: '2px solid rgba(255,255,255,0.8)' }}></div>
                    <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2" style={{ position: 'absolute' }}></div>

                    {/* Top Penalty Box */}
                    <div className="absolute top-0 left-1/2 w-64 h-32 transform -translate-x-1/2" style={{ position: 'absolute', borderBottom: '2px solid rgba(255,255,255,0.8)', borderLeft: '2px solid rgba(255,255,255,0.8)', borderRight: '2px solid rgba(255,255,255,0.8)' }}></div>
                    <div className="absolute top-0 left-1/2 w-24 h-12 transform -translate-x-1/2" style={{ position: 'absolute', borderBottom: '2px solid rgba(255,255,255,0.8)', borderLeft: '2px solid rgba(255,255,255,0.8)', borderRight: '2px solid rgba(255,255,255,0.8)' }}></div>
                    <div className="absolute top-24 left-1/2 w-32 h-16 rounded-full transform -translate-x-1/2 clip-top" style={{ position: 'absolute', borderBottom: '2px solid rgba(255,255,255,0.3)' }}></div>

                    {/* Bottom Penalty Box */}
                    <div className="absolute bottom-0 left-1/2 w-64 h-32 transform -translate-x-1/2" style={{ position: 'absolute', borderTop: '2px solid rgba(255,255,255,0.8)', borderLeft: '2px solid rgba(255,255,255,0.8)', borderRight: '2px solid rgba(255,255,255,0.8)' }}></div>
                    <div className="absolute bottom-0 left-1/2 w-24 h-12 transform -translate-x-1/2" style={{ position: 'absolute', borderTop: '2px solid rgba(255,255,255,0.8)', borderLeft: '2px solid rgba(255,255,255,0.8)', borderRight: '2px solid rgba(255,255,255,0.8)' }}></div>
                    <div className="absolute bottom-24 left-1/2 w-32 h-16 rounded-full transform -translate-x-1/2 clip-bottom" style={{ position: 'absolute', borderTop: '2px solid rgba(255,255,255,0.3)' }}></div>
                </div>

                {/* CORNER ARCS */}
                <div className="absolute top-4 left-4 w-6 h-6 rounded-br-full pointer-events-none z-0" style={{ position: 'absolute', borderRight: '2px solid rgba(255,255,255,0.8)', borderBottom: '2px solid rgba(255,255,255,0.8)' }}></div>
                <div className="absolute top-4 right-4 w-6 h-6 rounded-bl-full pointer-events-none z-0" style={{ position: 'absolute', borderLeft: '2px solid rgba(255,255,255,0.8)', borderBottom: '2px solid rgba(255,255,255,0.8)' }}></div>
                <div className="absolute bottom-4 left-4 w-6 h-6 rounded-tr-full pointer-events-none z-0" style={{ position: 'absolute', borderRight: '2px solid rgba(255,255,255,0.8)', borderTop: '2px solid rgba(255,255,255,0.8)' }}></div>
                <div className="absolute bottom-4 right-4 w-6 h-6 rounded-tl-full pointer-events-none z-0" style={{ position: 'absolute', borderLeft: '2px solid rgba(255,255,255,0.8)', borderTop: '2px solid rgba(255,255,255,0.8)' }}></div>

                {/* PLAYERS LAYER */}
                <div className="absolute inset-0 z-10" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                    {team.G?.map((p, i) => <PlayerNode key={`g-${i}`} player={p} position="G" index={i} total={team.G.length} formation={dominantFormation} />)}
                    {team.D?.map((p, i) => <PlayerNode key={`d-${i}`} player={p} position="D" index={i} total={team.D.length} formation={dominantFormation} />)}
                    {team.M?.map((p, i) => <PlayerNode key={`m-${i}`} player={p} position="M" index={i} total={team.M.length} formation={dominantFormation} />)}
                    {team.A?.map((p, i) => <PlayerNode key={`a-${i}`} player={p} position="A" index={i} total={team.A.length} formation={dominantFormation} />)}
                </div>
            </div >
        </div >
    );
};

export default PitchMap;
