
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const URLS_FILE = path.join(__dirname, '../src/data/j1_j15_urls.json');
const OUTPUT_FILE = path.join(__dirname, '../src/data/matches_history_detailed.json');

async function scrapeMatch(browser, url, roundInfo) {
    const page = await browser.newPage();
    try {
        // Optimization: Block images and fonts
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Wait for key elements (home/away team names, score)
        await page.waitForSelector('.duelParticipant__home', { timeout: 10000 });

        // Extract Basic Info
        const matchData = await page.evaluate(() => {
            const homeTeam = document.querySelector('.duelParticipant__home .participant__participantName')?.innerText.trim();
            const awayTeam = document.querySelector('.duelParticipant__away .participant__participantName')?.innerText.trim();
            const scoreHome = document.querySelector('.detailScore__wrapper span:nth-child(1)')?.innerText.trim();
            const scoreAway = document.querySelector('.detailScore__wrapper span:nth-child(3)')?.innerText.trim();

            return {
                homeTeam,
                awayTeam,
                score: `${scoreHome}-${scoreAway}`
            };
        });

        // Click "Résumé" tab if not active? Usually default.
        // We look for events .smv__incident

        // Extract Events
        const events = await page.evaluate(() => {
            const incidents = Array.from(document.querySelectorAll('.smv__incident'));
            return incidents.map(el => {
                const timeBox = el.querySelector('.smv__timeBox')?.innerText.trim() || '';
                const time = timeBox.replace("'", "");

                let type = 'Unknown';
                let detail = '';
                let team = 'Unknown'; // tougher to determine purely from class sometimes, need to check parent or relative position

                // Determine team by checking if it's in the home or away column
                // .smv__homeParticipant or .smv__awayParticipant wrapper usually
                const isHome = el.classList.contains('smv__homeParticipant') || el.closest('.smv__homeParticipant');

                // Simple heuristic if structure is different: check icon location
                // But let's assume standard Flashscore structure

                // Icon types
                if (el.querySelector('svg[data-testid="wcl-icon-soccer"]')) type = 'Goal';
                else if (el.querySelector('svg[data-testid="wcl-icon-yellowCard"]')) type = 'Yellow Card';
                else if (el.querySelector('svg[data-testid="wcl-icon-redCard"]')) type = 'Red Card';
                else if (el.querySelector('svg[data-testid="wcl-icon-substitution"]')) type = 'Substitution';
                else if (el.querySelector('svg[data-testid="wcl-icon-var"]')) type = 'VAR';
                else if (el.querySelector('.smv__subIcon--penalty')) { type = 'Goal'; detail = 'Penalty'; } // Sometimes specific

                // Player name
                const player = el.querySelector('.smv__playerName')?.innerText.trim() || '';
                const assist = el.querySelector('.smv__assist')?.innerText.trim() || '';

                if (type === 'Goal' && assist) detail = `Assist: ${assist}`;
                if (el.querySelector('.smv__subIcon--ownGoal')) detail = 'Own Goal';

                return {
                    time,
                    type,
                    player,
                    detail,
                    isHome // We'll map to team name later
                };
            }).filter(e => e.type !== 'Unknown'); // Filter out section headers like "1st Half"
        });

        // Post-process events to add Team Name
        const processedEvents = events.map(e => ({
            ...e,
            team: e.isHome ? matchData.homeTeam : matchData.awayTeam,
            isHome: undefined // clean up
        }));

        await page.close();
        return {
            ...matchData,
            round: roundInfo,
            events: processedEvents,
            url
        };

    } catch (error) {
        console.error(`Error scraping ${url}:`, error.message);
        await page.close();
        return { url, error: error.message };
    }
}

async function run() {
    // Read URLs
    const rawData = fs.readFileSync(URLS_FILE, 'utf-8');
    const rounds = JSON.parse(rawData);

    const browser = await puppeteer.launch({ headless: "new" });
    const allMatches = [];

    // Flatten logic handling
    let totalMatches = 0;
    for (const round of rounds) totalMatches += round.matches.length;
    console.log(`Starting scrape for ${totalMatches} matches...`);

    let processedCount = 0;

    for (const round of rounds) {
        console.log(`--- Processing ${round.round} ---`);

        // Parallelize matches in batches of 3 to be nice to the server and CPU
        const BATCH_SIZE = 3;
        for (let i = 0; i < round.matches.length; i += BATCH_SIZE) {
            const batch = round.matches.slice(i, i + BATCH_SIZE);
            const promises = batch.map(m => scrapeMatch(browser, m.url, round.round));

            const results = await Promise.all(promises);
            results.forEach(r => {
                if (!r.error) allMatches.push(r);
            });

            processedCount += results.length;
            console.log(`Progress: ${processedCount}/${totalMatches}`);
        }
    }

    await browser.close();

    // Save Results
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allMatches, null, 2));
    console.log(`\nScraping complete! Data saved to ${OUTPUT_FILE}`);
}

run();
