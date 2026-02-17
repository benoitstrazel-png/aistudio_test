import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const URLS_FILE = path.join(__dirname, '../src/data/matches_urls_2025_2026.json');
const OUTPUT_FILE = path.join(__dirname, '../src/data/lineups_2025_2026.json');

const extractId = (url) => {
    if (!url) return null;
    // Prioritize mid parameter if present
    const midMatch = url.match(/[?&]mid=([A-Za-z0-9\-_]+)/);
    if (midMatch && midMatch[1]) return midMatch[1];

    // Check for standard /match/ID/ format, excluding common words like 'football'
    const shortMatch = url.match(/\/match\/([A-Za-z0-9\-_]+)/);
    if (shortMatch && shortMatch[1]) {
        const id = shortMatch[1];
        if (id.length === 8 && id !== 'football' && id !== 'soccer') return id;
    }

    return url;
};

async function scrapeLineups(browser, url, roundInfo) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    try {
        // Interception disabled to ensure full SPA loading stability
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Use ID to construct canonical URL (avoids redirection to future matches)
        const id = (url && !url.includes('http')) ? url : extractId(url);
        const cleanUrl = `https://www.flashscore.fr/match/${id}`;
        console.log(`  Navigating to ${cleanUrl} (ID: ${id})`);

        // 1. Visit Main Match Page (Resume)
        await page.goto(cleanUrl + '/#/resume', { waitUntil: 'networkidle2', timeout: 60000 });

        // Handle Cookies Immediately
        try {
            const acceptBtn = await page.waitForSelector('#onetrust-accept-btn-handler', { timeout: 3000 });
            if (acceptBtn) {
                await acceptBtn.click();
                await new Promise(r => setTimeout(r, 1000));
            }
        } catch (e) { }

        await page.waitForSelector('.duelParticipant__startTime', { timeout: 10000 }).catch(() => null);

        // 2. Date Check Logic
        const matchStatus = await page.evaluate(() => {
            const startTimeEl = document.querySelector('.duelParticipant__startTime');
            if (!startTimeEl) return { canScrape: true };

            const dateText = startTimeEl.innerText.trim(); // "17.01.2026 14:00"
            const [datePart, timePart] = dateText.split(' ');
            if (datePart && timePart) {
                const [day, month, year] = datePart.split('.').map(Number);
                const [hour, minute] = timePart.split(':').map(Number);
                const matchDate = new Date(year, month - 1, day, hour, minute);
                const now = new Date();
                if (matchDate > now) {
                    return { canScrape: false, reason: `Future match: ${dateText}` };
                }
            }
            return { canScrape: true };
        });

        if (!matchStatus.canScrape) {
            console.log(`  -> Skipped: ${matchStatus.reason}`);
            await page.close();
            return { url, round: roundInfo, error: "Future match", skipped: true };
        }

        // 3. Interactive Tab Click (The Fix)
        await new Promise(r => setTimeout(r, 2000)); // Extra wait for stability
        console.log("  Searching for COMPOS tab...");
        const tabClicked = await page.evaluate(async () => {
            // Target specific elements likely to be tabs to avoid traversing entire DOM
            const all = Array.from(document.querySelectorAll('a, button, div, span'));
            // Look for COMPOS or COMPOSITIONS
            const target = all.find(el => {
                const text = el.innerText ? el.innerText.trim().toUpperCase() : '';
                return (text === 'COMPOS' || text === 'COMPOSITIONS') && el.offsetParent !== null; // check visibility
            });
            if (target) {
                target.click();
                return true;
            }
            return false;
        });

        if (!tabClicked) {
            console.log("  -> Tab COMPOS not found. Trying direct URL as fallback.");
            await page.goto(cleanUrl + '/#/resume/compositions', { waitUntil: 'networkidle2', timeout: 30000 });
        } else {
            console.log("  -> Clicked tab. Waiting for content...");
            await new Promise(r => setTimeout(r, 3000)); // Wait for SPA render
        }

        // 4. Extract Data
        await page.waitForSelector('.wcl-participantName_HhMjB, .wcl-nameWrapper_CgKPn, [class*="participantName"], .lf__lineUp', { timeout: 10000 }).catch(e => console.log("  -> Timeout waiting for player selectors"));

        const data = await page.evaluate(() => {
            const h = document.querySelector('.duelParticipant__home .participant__participantName')?.innerText.trim() || 'Home';
            const a = document.querySelector('.duelParticipant__away .participant__participantName')?.innerText.trim() || 'Away';

            const homePlayers = [];
            const awayPlayers = [];

            // Helper to parse a player element
            const parsePlayer = (el) => {
                const nameEl = el.querySelector('.wcl-name_ZggyJ, .wcl-participantName_HhMjB, [class*="participantName"]');
                if (!nameEl) return null;
                const name = nameEl.innerText.trim();

                // Check if Goalkeeper
                const roleEl = el.querySelector('.wcl-roles_GB-m2, title[title="Gardien"], span[title="Gardien"]');
                const isGK = roleEl && (roleEl.innerText.includes('(G)') || roleEl.title === 'Gardien');
                // Note: Flashscore doesn't reliably show DEF/MID/ATT on this view, mostly just (G) and (C)

                // Clean name (remove (C) if just appended as text, though usually it's a separate element)
                const cleanName = name.replace(/\(C\)/g, '').trim();

                return { name: cleanName, pos: isGK ? 'G' : '' };
            };

            // Find all sections
            const sections = Array.from(document.querySelectorAll('.section'));

            sections.forEach(section => {
                const header = section.querySelector('[data-testid="wcl-headerSection-text"], .wcl-headerSection_SGpOR');
                if (!header) return;

                const headerText = header.innerText.toUpperCase();

                // We ONLY want Starting XI and Substitutes
                // "COMPOSITIONS DE DÉPART" or "REMPLAÇANTS"
                // We must IGNORE "JOUEURS REMPLACÉS", "ABSENTS", "ENTRAINEURS"

                const isStarting = headerText.includes('COMPOSITIONS DE DÉPART') || headerText.includes('STARTING LINEUPS');
                const isSubs = headerText.includes('REMPLAÇANTS') || headerText.includes('SUBSTITUTES');

                if (!isStarting && !isSubs) return;
                if (headerText.includes('JOUEURS REMPLACÉS')) return; // Explicit ignore just in case

                const sidesBox = section.querySelector('.lf__sidesBox, .lf__sides');
                if (!sidesBox) return;

                const sides = sidesBox.querySelectorAll('.lf__side');
                if (sides.length < 2) return;

                // Home is usually first (0), Away is second (1)
                const homeSide = sides[0];
                const awaySide = sides[1];

                const extractFromSide = (sideContainer, targetArray) => {
                    const playerRows = Array.from(sideContainer.querySelectorAll('.lf__participantNew, .wcl-participant_v7u5b'));
                    playerRows.forEach(row => {
                        // Filter out rows that might be sub-headers or empty
                        if (!row.innerText.trim()) return;

                        const p = parsePlayer(row);
                        if (p && !targetArray.find(EXIST => EXIST.name === p.name)) {
                            targetArray.push(p);
                        }
                    });
                };

                extractFromSide(homeSide, homePlayers);
                extractFromSide(awaySide, awayPlayers);
            });

            // If completely empty, fallback for safety (though unlikely with new logic if page loaded)
            if (homePlayers.length === 0 && awayPlayers.length === 0) {
                // Try generic fallback but strictly exclude known bad sections
                // (omitted for now to rely on strict parsing safety)
            }

            return { h, a, homePlayers, awayPlayers };
        });

        await page.close();

        // Check availability
        if (data.homePlayers.length >= 10 && data.awayPlayers.length >= 10) {
            console.log(`  -> Found lineups: Home=${data.homePlayers.length}, Away=${data.awayPlayers.length}`);
            return {
                url,
                round: roundInfo,
                teams: { home: data.h, away: data.a },
                lineups: {
                    homeStarters: data.homePlayers.slice(0, 11),
                    awayStarters: data.awayPlayers.slice(0, 11),
                    homeSubstitutes: data.homePlayers.slice(11),
                    awaySubstitutes: data.awayPlayers.slice(11)
                }
            };
        } else {
            console.log(`  -> Too few players: Home=${data.homePlayers.length}, Away=${data.awayPlayers.length}`);
            return { url, round: roundInfo, error: `Too few players found: Home=${data.homePlayers.length}, Away=${data.awayPlayers.length}`, playersFound: data };
        }
    } catch (e) {
        await page.close();
        return { url, round: roundInfo, error: e.message };
    }
}

async function run() {
    try {
        let rounds = JSON.parse(fs.readFileSync(URLS_FILE, 'utf-8'));

        // Filter for Journée 1 to 18 as requested
        rounds = rounds.filter(r => {
            const match = r.round.match(/Journée (\d+)/);
            if (match) {
                const num = parseInt(match[1], 10);
                return num >= 21 && num <= 22;
            }
            return false;
        });
        console.log(`Filtered to ${rounds.length} rounds (1-34).`);

        let allLineups = fs.existsSync(OUTPUT_FILE) ? JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8')) : [];
        console.log(`Starting Lineups Scrape. Existing: ${allLineups.length}`);

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const save = (data) => {
            const tmp = `${OUTPUT_FILE}.tmp`;
            fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
            fs.renameSync(tmp, OUTPUT_FILE);
        };

        let processed = 0;
        let total = 0;
        rounds.forEach(r => total += r.matches.length);

        for (const round of rounds) {
            for (const match of round.matches) {
                processed++;
                const id = match.id || extractId(match.url);
                const existing = allLineups.find(l => extractId(l.url) === id);

                if (existing && !existing.error && existing.lineups?.homeStarters?.length >= 10) continue;

                // Pass ID if URL is missing, otherwise URL
                const target = match.url || id;
                console.log(`[${processed}/${total}] ${target}`);
                const res = await scrapeLineups(browser, target, round.round);

                if (res.lineups?.homeStarters?.length >= 10) {
                    if (existing) allLineups[allLineups.indexOf(existing)] = res;
                    else allLineups.push(res);
                    console.log(`  -> Success: ${res.lineups.homeStarters.length}+${res.lineups.awayStarters.length} found.`);
                } else if (res.skipped) {
                    console.log(`  -> Skipped: ${res.error}`);
                    // Continue, do not exit for skips
                } else {
                    console.log(`  -> Failed: ${res.error || 'Incomplete'}`);

                    // STOP EXECUTION AS REQUESTED
                    console.error("CRITICAL ERROR: Failed to retrieve lineups for match. Halting script.");
                    await browser.close();
                    process.exit(1);
                }

                if (processed % 3 === 0) save(allLineups);
                await new Promise(r => setTimeout(r, 1000));
            }
        }
        await browser.close();
        save(allLineups);
        console.log("Done.");
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
