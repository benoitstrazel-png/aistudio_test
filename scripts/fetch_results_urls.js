
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
    console.log('--- Environment Check ---');
    console.log('PUPPETEER_EXECUTABLE_PATH:', process.env.PUPPETEER_EXECUTABLE_PATH);

    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || null;
    console.log(`Using executablePath: ${executablePath || 'bundled'}`);
    const browser = await puppeteer.launch({
        executablePath: executablePath || undefined,
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote',
            '--single-process'
        ]
    });
    const page = await browser.newPage();
    try {
        // Optimizing resources
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
                        const anchor = row.querySelector('a.event__match--oneLine');
                        let url = anchor ? anchor.href : `https://www.flashscore.fr/match/${id}/#/resume`;
                        currentMatches.push({ url, id, home, away });
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
                    matches: newEntry.matches.map(m => ({ url: m.url }))
                };

                if (existingRoundIndex !== -1) {
                    if (existingData[existingRoundIndex].matches.length !== formattedEntry.matches.length) {
                        console.log(`Updating existing round: ${newEntry.round}`);
                        existingData[existingRoundIndex] = formattedEntry;
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
