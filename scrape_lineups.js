import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

puppeteer.use(StealthPlugin());

const DATA_FILE = path.join(__dirname, 'src/data/lineups_2025_2026.json');

async function scrapeLineups() {
    console.log('Starting stealth lineup scraping...');

    // Load matches from URL source
    const URLS_FILE = path.join(__dirname, 'src/data/matches_urls_2025_2026.json');
    const rawUrlData = fs.readFileSync(URLS_FILE, 'utf-8');
    const rounds = JSON.parse(rawUrlData);

    // Flatten rounds to get all target URLs
    let urlMatches = [];
    rounds.forEach(r => {
        r.matches.forEach(m => urlMatches.push({ ...m, round: r.round }));
    });

    console.log(`Loaded ${urlMatches.length} matches from URL file.`);

    // Load existing data
    let matches = [];
    if (fs.existsSync(DATA_FILE)) {
        const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
        matches = JSON.parse(rawData);
    }

    console.log(`Loaded ${matches.length} existing scraped matches.`);

    // Merge: Add new matches from URL file to main data if missing
    let newMatchesAdded = 0;
    urlMatches.forEach(um => {
        const exists = matches.find(m => m.url === um.url);
        if (!exists) {
            matches.push({
                url: um.url,
                round: um.round,
                teams: { home: null, away: null },
                lineups: {}
            });
            newMatchesAdded++;
        }
    });

    if (newMatchesAdded > 0) {
        console.log(`Added ${newMatchesAdded} new matches (e.g. J16) to scrape list.`);
    }

    // Filter matches that are missing lineups OR have invalid formations (garbage text or N/A)
    const matchesToScrape = matches.filter(m => {
        // Valid formation pattern: "4-3-3" or "4-2-3-1" (approx < 10 chars)
        const isValid = (f) => f && f !== 'N/A' && f.length < 15 && /^\d-\d-\d/.test(f);

        // Check if we already have COMPLETE and VALID data
        if (m.lineups &&
            m.lineups.homeStarters && m.lineups.homeStarters.length > 0 &&
            isValid(m.lineups.homeFormation) &&
            isValid(m.lineups.awayFormation)) {
            // Already scraped and valid
            return false;
        }
        // Otherwise, include
        return true;
    });

    console.log(`Found ${matchesToScrape.length} matches to scrape out of ${matches.length}.`);

    if (matchesToScrape.length === 0) {
        console.log('Nothing to scrape. All matches have lineups.');
        return;
    }

    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--window-size=1920,1080'
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Set extra headers to look more like a real French user
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
    });

    for (let i = 0; i < matchesToScrape.length; i++) {
        const match = matchesToScrape[i];
        const matchIndex = matches.findIndex(m => m.url === match.url);

        const urlObj = new URL(match.url);
        let mid = urlObj.searchParams.get('mid');

        // Fallback: extract from path if no mid param (e.g. /match/ID/#/...)
        if (!mid) {
            const parts = urlObj.pathname.split('/');
            // usually /match/ID/ or /match/slug-ID/
            // find 'match' and take next part
            const matchIndex = parts.indexOf('match');
            if (matchIndex !== -1 && parts[matchIndex + 1]) {
                const potentialId = parts[matchIndex + 1];
                // potentialId might be "slug-ID" or just "ID"
                // Flashscore IDs are typically 8 chars alphanumeric, sometimes separated by dash if slug is present?
                // Actually the fetched URLs are like /match/8bZdtHle/ -> so it is just the ID.
                // If it was /match/lorient-lyon-8bZdtHle/, split by dash? 
                // The new URLs are raw IDs.
                mid = potentialId;
            }
        }

        if (!mid) continue;

        const targetUrl = `https://www.flashscore.fr/match/${mid}/`; // Start at summary

        console.log(`[${i + 1}/${matchesToScrape.length}] Scraping: ${targetUrl} (Round: ${match.round})`);

        try {
            await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
            await new Promise(r => setTimeout(r, 2000));

            // Accept Cookies
            try {
                const acceptBtn = await page.$('#onetrust-accept-btn-handler');
                if (acceptBtn) {
                    await acceptBtn.click();
                    await new Promise(r => setTimeout(r, 1000));
                }
            } catch (e) { }

            // Click "Compos" tab - Critical step
            let composLoaded = false;
            try {
                const clicked = await page.evaluate(() => {
                    // Specific strategy for Flashscore tabs
                    const tabs = Array.from(document.querySelectorAll('a[href*="/compositions"], button, .tabs__tab'));
                    const composTab = tabs.find(el => el.textContent.trim().toUpperCase().includes('COMPOS'));
                    if (composTab) {
                        composTab.click();
                        return true;
                    }
                    return false;
                });

                if (clicked) {
                    console.log('   -> Clicked "Compos" tab.');
                    await new Promise(r => setTimeout(r, 2000));

                    // Wait for the new content
                    try {
                        await page.waitForSelector('.lf__formation, .wcl-lineups, .lf__side', { timeout: 10000 });
                        composLoaded = true;
                    } catch (e) {
                        console.log('   -> Tab clicked but lineups selector timeout. Checking if content loaded anyway.');
                    }
                } else {
                    console.log('   -> "Compos" tab not found.');
                }
            } catch (e) {
                console.log('   -> Error interacting with tabs:', e.message);
            }

            // Fallback: if not loaded, try direct URL but this is known to be flaky
            if (!composLoaded) {
                // Try waiting a bit more or verify current URL
            }

            const scrapedData = await page.evaluate(() => {
                const result = {
                    homeFormation: 'N/A',
                    awayFormation: 'N/A',
                    homeStarters: [],
                    awayStarters: [],
                    homeSubstitutes: [],
                    awaySubstitutes: [],
                    homeCaptain: 'N/A',
                    homeGoalkeeper: 'N/A',
                    awayCaptain: 'N/A',
                    awayGoalkeeper: 'N/A',
                    teams: { home: '', away: '' }
                };

                // A. Extract Team Names
                try {
                    const homeTeamEl = document.querySelector('.duelParticipant__home .participant__participantName');
                    const awayTeamEl = document.querySelector('.duelParticipant__away .participant__participantName');
                    if (homeTeamEl) result.teams.home = homeTeamEl.textContent.trim();
                    if (awayTeamEl) result.teams.away = awayTeamEl.textContent.trim();
                } catch (e) { }

                // B. Starters
                const getSection = (txt) => Array.from(document.querySelectorAll('.section'))
                    .find(s => s.textContent.toLowerCase().includes(txt.toLowerCase()));

                const startersSection = getSection('composition') || getSection('starting lineups') || getSection('compositions de départ');
                if (startersSection) {
                    const sides = startersSection.querySelectorAll('.lf__side');
                    const extractPlayers = (container) => {
                        if (!container) return [];
                        let els = Array.from(container.querySelectorAll('.wcl-participantName_CgKPn, .wcl-nameWrapper_CgKPn, a[href*="/joueur/"]'));
                        return els.map(el => el.textContent.trim()).filter(n => n.length > 1);
                    };

                    if (sides.length >= 2) {
                        result.homeStarters = extractPlayers(sides[0]);
                        result.awayStarters = extractPlayers(sides[1]);

                        // Extract special roles
                        const findRole = (list, suffix) => {
                            const player = list.find(p => p.includes(suffix));
                            return player ? player.replace(suffix, '').trim() : 'N/A';
                        };

                        result.homeCaptain = findRole(result.homeStarters, '(C)');
                        result.homeGoalkeeper = findRole(result.homeStarters, '(G)');
                        result.awayCaptain = findRole(result.awayStarters, '(C)');
                        result.awayGoalkeeper = findRole(result.awayStarters, '(G)');
                    }
                }

                // C. Formations - Prioritize Brute Force Search
                const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
                let node;
                const formationMatches = [];
                // Pattern for 4-3-3, 4-2-3-1, etc. with optional spaces
                const formPattern = /^\s*(\d)\s*-\s*(\d)\s*-\s*(\d)(\s*-\s*(\d))?\s*$/;

                while (node = walk.nextNode()) {
                    const txt = node.textContent.trim();
                    if (txt.length < 15 && formPattern.test(txt)) {
                        const tag = node.parentElement.tagName.toLowerCase();
                        if (tag !== 'script' && tag !== 'style') {
                            // Normalize to X-X-X format
                            const normalized = txt.replace(/\s+/g, '');
                            formationMatches.push(normalized);
                        }
                    }
                }

                // If found in text nodes, use them (usually reliable)
                if (formationMatches.length >= 2) {
                    // Filter matches effectively (remove dups if sequential)
                    // Usually Home is first, Away is second
                    result.homeFormation = formationMatches[0];
                    result.awayFormation = formationMatches[1];
                } else {
                    // Fallback to selectors ONLY if they match the pattern (avoid giant strings)
                    const formationEls = document.querySelectorAll('.lf__formation');
                    if (formationEls.length >= 2) {
                        const t1 = formationEls[0].textContent.trim();
                        const t2 = formationEls[1].textContent.trim();
                        if (formPattern.test(t1)) result.homeFormation = t1.replace(/\s+/g, '');
                        if (formPattern.test(t2)) result.awayFormation = t2.replace(/\s+/g, '');
                    }
                }

                // D. Substitutes
                const subHeader = Array.from(document.querySelectorAll('.wcl-headerSection_SGpOR, .section__title'))
                    .find(h => h.textContent.trim().toUpperCase().includes('REMPLAÇANTS') || h.textContent.trim().toUpperCase().includes('SUBSTITUTES'));

                if (subHeader) {
                    let container = subHeader.parentElement;
                    while (container && !container.querySelector('.lf__side')) {
                        container = container.nextElementSibling || container.parentElement;
                        if (!container || container.tagName === 'BODY') break;
                    }

                    if (container) {
                        const sides = container.querySelectorAll('.lf__side');
                        if (sides.length >= 2) {
                            const extractSubs = (side) => {
                                const names = [];
                                const rows = side.querySelectorAll('.lf__participant, .wcl-participant_CgKPn');
                                rows.forEach(row => {
                                    const nameEl = row.querySelector('.wcl-participantName_CgKPn, a');
                                    if (nameEl) {
                                        const name = nameEl.textContent.trim();
                                        const hasIcon = row.querySelector('.wcl-icon-subst, .substitution-in') !== null;
                                        names.push(hasIcon ? `${name} (sub)` : name);
                                    }
                                });
                                return names;
                            };

                            result.homeSubstitutes = extractSubs(sides[0]);
                            result.awaySubstitutes = extractSubs(sides[1]);
                        }
                    }
                }

                return result;
            });

            if (scrapedData.homeStarters.length > 0) {
                console.log(`   -> Success! Found ${scrapedData.homeStarters.length} home starters.`);
                console.log(`   -> Formations: ${scrapedData.homeFormation} vs ${scrapedData.awayFormation}`);
                console.log(`   -> Teams: ${scrapedData.teams.home} vs ${scrapedData.teams.away}`);
                console.log(`   -> Captains: ${scrapedData.homeCaptain} (H) / ${scrapedData.awayCaptain} (A)`);
                console.log(`   -> GK: ${scrapedData.homeGoalkeeper} (H) / ${scrapedData.awayGoalkeeper} (A)`);

                matches[matchIndex].lineups = {
                    ...matches[matchIndex].lineups,
                    ...scrapedData,
                };
                matches[matchIndex].teams = scrapedData.teams;
            } else {
                console.log('   -> No starters found.');
            }

        } catch (error) {
            console.error(`   -> Error: ${error.message}`);
        }

        // Save progress every 5 matches
        if ((i + 1) % 5 === 0) {
            fs.writeFileSync(DATA_FILE, JSON.stringify(matches, null, 2));
            console.log('   [Saved Progress]');
        }
    }

    // Final save
    fs.writeFileSync(DATA_FILE, JSON.stringify(matches, null, 2));

    await browser.close();
}

scrapeLineups();
