
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target file
const URLS_FILE = path.join(__dirname, '../src/data/matches_urls_2025_2026.json');
const RESULTS_URL = 'https://www.flashscore.fr/football/france/ligue-1/resultats/';

async function fetchUrls() {
    console.log('Launching browser to fetch latest results...');

    const browser = await puppeteer.launch({
        headless: true, // "new" is deprecated, usually true or "new" works
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--window-size=1920,1080'
        ]
    });
    const page = await browser.newPage();
    try {
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            if (['image', 'media', 'font', 'stylesheet'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });
        await page.setViewport({ width: 1920, height: 1080 });

        console.log(`Navigating to ${RESULTS_URL}...`);
        await page.goto(RESULTS_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        // Accept Cookies
        try {
            const acceptBtn = await page.$('#onetrust-accept-btn-handler');
            if (acceptBtn) {
                console.log('Accepting cookies...');
                await acceptBtn.click();
                await new Promise(r => setTimeout(r, 1000));
            }
        } catch (e) { }

        console.log('Waiting for match list...');
        await page.waitForSelector('.sportName.soccer');

        // Click "Show more matches" until all are loaded
        try {
            let clicks = 0;
            while (clicks < 15) {
                // Try finding by text "Montrer plus de matchs"
                const moreBtn = await page.evaluateHandle(() => {
                    const links = Array.from(document.querySelectorAll('a'));
                    return links.find(el => el.textContent.includes('Montrer plus de matchs'));
                });

                if (moreBtn && await moreBtn.asElement()) {
                    console.log(`Clicking "Show more matches" (${clicks + 1})...`);
                    await moreBtn.asElement().click();
                    await new Promise(r => setTimeout(r, 2000));
                    clicks++;
                } else {
                    console.log("No more 'Show more matches' button found.");
                    break;
                }
            }
        } catch (e) {
            console.log("Error clicking show more:", e.message);
        }

        // Extract Data
        const roundsData = await page.evaluate(() => {
            const rounds = [];
            let currentRound = null;
            let currentMatches = [];

            const rows = document.querySelectorAll('.sportName.soccer > div');

            rows.forEach(row => {
                if (row.classList.contains('event__round')) {
                    if (currentRound) {
                        rounds.push({ round: currentRound, matches: currentMatches });
                    }
                    currentRound = row.textContent.trim();
                    currentMatches = [];
                } else if (row.classList.contains('event__match')) {
                    const id = row.id.split('_').pop();
                    if (id && currentRound) {
                        const home = row.querySelector('.event__participant--home')?.textContent.trim();
                        const away = row.querySelector('.event__participant--away')?.textContent.trim();
                        const timeText = row.querySelector('.event__time')?.textContent.trim();
                        const anchor = row.querySelector('a.event__match--oneLine');
                        let url = anchor ? anchor.href : `https://www.flashscore.fr/match/${id}/#/resume`;

                        let date = null;
                        let timestamp = null;

                        if (timeText) {
                            // Format usually "25.01. 17:00" or "Hier" or "Aujourd'hui"
                            // We need to be careful. Since we are in results, it's likely "dd.MM. HH:mm"
                            // Assuming current year 2026 for now or deducing?
                            // Actually, let's just store the text as "date" and try to parse TS.
                            date = timeText;

                            // Simple parsing for "dd.MM. HH:mm"
                            const dateMatch = timeText.match(/(\d+)\.(\d+)\.\s*(\d+):(\d+)/);
                            if (dateMatch) {
                                const [_, day, month, hour, minute] = dateMatch;
                                // Heuristic for year: Season is 2025-2026.
                                // If Month > 7 -> 2025. If Month <= 7 -> 2026.
                                const m = parseInt(month, 10);
                                const year = m > 7 ? 2025 : 2026;
                                timestamp = new Date(year, m - 1, parseInt(day, 10), parseInt(hour, 10), parseInt(minute, 10)).getTime();
                            }
                        }

                        currentMatches.push({ url, id, home, away, date, timestamp });
                    }
                }
            });
            if (currentRound) {
                rounds.push({ round: currentRound, matches: currentMatches });
            }
            return rounds;
        });

        console.log(`Found ${roundsData.length} rounds of data.`);

        if (roundsData.length > 0) {
            let existingData = [];
            if (fs.existsSync(URLS_FILE)) {
                existingData = JSON.parse(fs.readFileSync(URLS_FILE, 'utf-8'));
            }

            roundsData.forEach(newEntry => {
                const existingRoundIndex = existingData.findIndex(r => r.round === newEntry.round);
                const formattedEntry = {
                    round: newEntry.round,
                    matches: newEntry.matches.map(m => ({
                        url: m.url,
                        id: m.id,
                        date: m.date,
                        timestamp: m.timestamp
                    }))
                };

                if (existingRoundIndex !== -1) {
                    // Normalize for comparison
                    const newCount = formattedEntry.matches.length;
                    const oldCount = existingData[existingRoundIndex].matches.length;

                    // Update if count is >= (we want to update metadata even if count is same)
                    // BUT WE MUST PRESERVE EXISTING FIELDS (like statsUrl)
                    if (newCount >= oldCount) {
                        console.log(`Updating existing round: ${newEntry.round} (Count: ${newCount})`);

                        // Merge logic: match new entries with old ones by URL
                        const mergedMatches = formattedEntry.matches.map(newMatch => {
                            const oldMatch = existingData[existingRoundIndex].matches.find(om => om.url === newMatch.url);
                            return oldMatch ? { ...oldMatch, ...newMatch } : newMatch; // New overrides old, but keeps unique old fields? No, we want New to bring metadata, Old to keep statsUrl
                            // Actually: { ...oldMatch, ...newMatch } will overwrite old fields with new ones.
                            // oldMatch has statsUrl. newMatch has date/timestamp/id.
                            // So { ...oldMatch, ...newMatch } works perfectly.
                        });

                        existingData[existingRoundIndex].matches = mergedMatches;
                    } else {
                        console.warn(`Skipping update for ${newEntry.round}: New data has fewer matches (${newCount}) than existing (${oldCount}).`);
                    }
                } else {
                    console.log(`Adding new round: ${newEntry.round}`);
                    existingData.unshift(formattedEntry);
                }
            });

            fs.writeFileSync(URLS_FILE, JSON.stringify(existingData, null, 4));
            console.log(`Updated ${URLS_FILE} with current rounds.`);
        } else {
            console.log('No round data found.');
        }

    } catch (e) {
        console.error('Error in fetchUrls:', e);
    } finally {
        await browser.close();
    }
}

fetchUrls();
