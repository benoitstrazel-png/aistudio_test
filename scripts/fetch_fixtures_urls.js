
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const URLS_FILE = path.join(__dirname, '../src/data/matches_urls_2025_2026.json');
const FIXTURES_URL = 'https://www.flashscore.fr/football/france/ligue-1/calendrier/';

async function fetchFixtures() {
    console.log('Launching browser to fetch fixtures...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        await page.goto(FIXTURES_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        // Accept Cookies
        try {
            const acceptBtn = await page.$('#onetrust-accept-btn-handler');
            if (acceptBtn) await acceptBtn.click();
        } catch (e) { }

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
                        const anchor = row.querySelector('a.event__match--oneLine');
                        let url = anchor ? anchor.href : `https://www.flashscore.fr/match/${id}/#/resume`;
                        // Basic check for duplicates in current list
                        if (!currentMatches.find(m => m.url === url)) {
                            currentMatches.push({ url });
                        }
                    }
                }
            });
            if (currentRound) rounds.push({ round: currentRound, matches: currentMatches });
            return rounds;
        });

        console.log(`Found ${roundsData.length} rounds in fixtures.`);

        // Filter for J20 specifically (or merge all if needed, but user focused on J20)
        // Note: Flashscore text might be "Journée 20" or similar.
        const j20 = roundsData.find(r => r.round.includes('Journée 20'));

        if (j20) {
            console.log(`Found J20 in fixtures with ${j20.matches.length} matches.`);

            // Merge logic
            let existingData = JSON.parse(fs.readFileSync(URLS_FILE, 'utf-8'));
            const existingJ20Index = existingData.findIndex(r => r.round === 'Journée 20');

            if (existingJ20Index !== -1) {
                const existingMatches = existingData[existingJ20Index].matches;
                const newMatches = j20.matches;

                let addedCount = 0;
                newMatches.forEach(nm => {
                    if (!existingMatches.find(em => em.url === nm.url)) {
                        existingMatches.push(nm);
                        addedCount++;
                    }
                });

                console.log(`Added ${addedCount} new matches to J20.`);
                existingData[existingJ20Index].matches = existingMatches;

                fs.writeFileSync(URLS_FILE, JSON.stringify(existingData, null, 4));
                console.log("Updated matches_urls_2025_2026.json");
            } else {
                console.warn("Journée 20 not found in existing file to merge into. (Unexpected)");
            }
        } else {
            console.warn("Journée 20 NOT found in fixtures.");
            // Debug rounds found
            roundsData.forEach(r => console.log(` - ${r.round} (${r.matches.length})`));
        }

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
}

fetchFixtures();
