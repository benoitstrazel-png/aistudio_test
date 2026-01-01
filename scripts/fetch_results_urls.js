
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target file (we'll update the existing one or create a new generic one)
const URLS_FILE = path.join(__dirname, '../src/data/matches_urls_2025_2026.json');
const RESULTS_URL = 'https://www.flashscore.fr/football/france/ligue-1/resultats/';

async function fetchUrls() {
    console.log('Launching browser to fetch latest results...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    try {
        console.log(`Navigating to ${RESULTS_URL}...`);
        await page.goto(RESULTS_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        // Accept Cookies if present
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

        // Extract Data
        const roundsData = await page.evaluate(() => {
            const rounds = [];
            let currentRound = null;
            let currentMatches = [];

            // The structure is usually flat: header (round) -> match -> match -> header...
            // Need to iterate rows.
            const rows = document.querySelectorAll('.sportName.soccer > div');

            rows.forEach(row => {
                if (row.classList.contains('event__round')) {
                    // New round header
                    if (currentRound) {
                        rounds.push({ round: currentRound, matches: currentMatches });
                    }
                    currentRound = row.textContent.trim();
                    currentMatches = [];
                } else if (row.classList.contains('event__match')) {
                    // Match row
                    const id = row.id.split('_').pop(); // id="g_1_Ofuj6kjR" -> "Ofuj6kjR"
                    if (id && currentRound) {
                        const home = row.querySelector('.event__participant--home')?.textContent.trim();
                        const away = row.querySelector('.event__participant--away')?.textContent.trim();
                        // Construct URL
                        // Usually: https://www.flashscore.fr/match/{home}-{away}-{id}/?mid={id}
                        // But verifying the id part is crucial. Flashscore IDs are sufficient.
                        // Format user uses: https://www.flashscore.fr/match/football/lorient-jgNAYRGi/lyon-2akflumR/?mid=Qc01MMcM
                        // We might need to construct a generic one or extract the specific href if it exists (it's often an onclick or hidden link)

                        const anchor = row.querySelector('a.event__match--oneLine');
                        let url = null;
                        if (anchor) {
                            url = anchor.href;
                        } else {
                            // Fallback construction
                            // The exact slug names are hard to guess (e.g. "lorient-jgNAYRGi"). 
                            // However, Flashscore often redirects /match/{id}/ to the full url.
                            url = `https://www.flashscore.fr/match/${id}/#/resume`;
                        }

                        currentMatches.push({ url, id, home, away });
                    }
                }
            });
            // Push last one
            if (currentRound) {
                rounds.push({ round: currentRound, matches: currentMatches });
            }
            return rounds;
        });

        console.log(`Found ${roundsData.length} rounds of data.`);

        // Find Journée 16
        const targetRound = roundsData.find(r => r.round.includes('Journée 16'));

        if (targetRound) {
            console.log(`Found ${targetRound.round} with ${targetRound.matches.length} matches.`);

            // Format for compatibility with existing JSON
            // Existing format: { "round": "Journée 15", "matches": [ { "url": "..." } ] }

            const newEntry = {
                round: targetRound.round,
                matches: targetRound.matches.map(m => ({
                    // We need to resolve the full URL if possible, or use the short one if scrape_lineups supports it.
                    // Scrape lineups uses: const mid = urlObj.searchParams.get('mid') OR parsing ID.
                    // My previous edits to scrape_lineups used `mid` extraction.
                    // Short URL: https://www.flashscore.fr/match/{id}/#/resume
                    // This often redirects correctly. Let's try to ensure we get a usable URL.
                    url: m.url
                }))
            };

            // Read existing file
            let existingData = [];
            if (fs.existsSync(URLS_FILE)) {
                existingData = JSON.parse(fs.readFileSync(URLS_FILE, 'utf-8'));
            }

            // Check if J16 already exists
            const existingRoundIndex = existingData.findIndex(r => r.round === newEntry.round);
            if (existingRoundIndex !== -1) {
                console.log('Updating existing round data...');
                existingData[existingRoundIndex] = newEntry;
            } else {
                console.log('Adding new round data...');
                // Prepend or append? Usually newest first in this file based on user scrolling?
                // The file viewed earlier had J15 first. So prepend.
                existingData.unshift(newEntry);
            }

            // Save
            fs.writeFileSync(URLS_FILE, JSON.stringify(existingData, null, 4));
            console.log(`Updated ${URLS_FILE}`);
        } else {
            console.log('Journée 16 not found in the loaded results. Might need to scroll or click "Show more".');
            // Log what WAS found
            console.log('Available rounds:', roundsData.map(r => r.round).join(', '));
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
}

fetchUrls();
