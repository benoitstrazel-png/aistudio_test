
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const URLS_FILE = path.join(__dirname, '../src/data/matches_urls_2025_2026.json');
const OUTPUT_FILE = path.join(__dirname, '../src/data/matches_history_detailed.json');

async function scrapeMatch(browser, url, roundInfo) {
    const page = await browser.newPage();
    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
        console.log(`Navigating to ${url}...`);

        // Use a slightly looser wait condition to prevent timeouts if network is busy
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

        // AUTO-SCROLL to trigger lazy load of events
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 150;
                // Scroll down a fixed amount enough to trigger the lower section
                const timer = setInterval(() => {
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    // Stop after scrolling reasonable amount (e.g. 2000px) or bottom
                    if (totalHeight >= 2000 || totalHeight >= document.body.scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });

        // Wait for potential network requests for events
        await new Promise(r => setTimeout(r, 1500));

        // Wait for key elements
        try {
            // Check if we have the rows
            await page.waitForSelector('.smv__participantRow', { timeout: 5000 });
        } catch (e) {
            console.log("Warning: No event rows found immediately.");
        }

        // Extract Basic Info
        const matchData = await page.evaluate(() => {
            const homeTeam = document.querySelector('.duelParticipant__home .participant__participantName')?.innerText.trim();
            const awayTeam = document.querySelector('.duelParticipant__away .participant__participantName')?.innerText.trim();
            const scoreHome = document.querySelector('.detailScore__wrapper span:nth-child(1)')?.innerText.trim();
            const scoreAway = document.querySelector('.detailScore__wrapper span:nth-child(3)')?.innerText.trim();


            const referee = Array.from(document.querySelectorAll('.mi__item'))
                .find(item => item.textContent.toUpperCase().includes('ARBITRE'))
                ?.querySelector('.mi__content')?.innerText.trim() || 'N/A';

            return {
                homeTeam,
                awayTeam,
                score: `${scoreHome}-${scoreAway}`,
                referee
            };
        });

        // Extract Events
        const events = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('.smv__participantRow'));
            return rows.map(el => {
                const time = el.querySelector('.smv__timeBox')?.innerText.trim().replace("'", "") || '';
                const player = el.querySelector('.smv__playerName')?.innerText.trim() || '';

                const text = el.innerText || '';
                const svg = el.querySelector('.smv__incidentIcon svg');
                const svgClass = (svg && svg.getAttribute('class')) || '';

                let type = 'Unknown';
                let detail = '';

                // Text-based detection for Goals (e.g., "1 - 0")
                if (/\d+\s*-\s*\d+/.test(text)) {
                    type = 'Goal';
                    const lowerText = text.toLowerCase();

                    if (lowerText.includes('(csc)') || lowerText.includes('own goal') || lowerText.includes('(own goal)')) {
                        detail = 'Own Goal';
                    } else if (lowerText.includes('penalty')) {
                        detail = 'Penalty';
                    } else {
                        // Check for Assist (content in parentheses that is not penalty/csc)
                        const parenthesized = text.match(/\(([^)]+)\)/);
                        if (parenthesized) {
                            const content = parenthesized[1];
                            const lowerContent = content.toLowerCase();
                            // Double check to ensure we don't capture 'Penalty' or 'CSC' here if missed above
                            if (!lowerContent.includes('penalty') && !lowerContent.includes('csc') && !lowerContent.includes('own goal')) {
                                detail = `Assist: ${content}`;
                            }
                        }
                    }
                }
                else if (svgClass.includes('yellowCard')) type = 'Yellow Card';
                else if (svgClass.includes('redCard')) type = 'Red Card';
                else if (svgClass.includes('substitution')) type = 'Substitution';
                else if (svgClass.includes('penalty-missed')) { type = 'Other'; detail = 'Pénalty manqué'; }

                // Specific checks
                if (el.querySelector('.smv__subIcon--penalty')) {
                    type = 'Goal';
                    detail = 'Penalty';
                }
                if (el.querySelector('.smv__subIcon--ownGoal')) detail = 'Own Goal';

                const isHome = el.classList.contains('smv__homeParticipant');

                return { time, player, type, detail, isHome };
            }).filter(e => e.type !== 'Unknown');
        });

        // Post-process
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
        // Return structured error but keep url/round so we know what failed
        return { url, round: roundInfo, error: error.message, events: [] };
    }
}

async function run() {
    const rawData = fs.readFileSync(URLS_FILE, 'utf-8');
    const rounds = JSON.parse(rawData);

    console.log('--- Environment Check ---');
    console.log('PUPPETEER_EXECUTABLE_PATH:', process.env.PUPPETEER_EXECUTABLE_PATH);
    console.log('PUPPETEER_SKIP_CHROMIUM_DOWNLOAD:', process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD);

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
    const allMatches = [];

    let totalMatches = 0;
    for (const round of rounds) totalMatches += round.matches.length;
    console.log(`Starting FULL scrape for ${totalMatches} matches...`);

    let processedCount = 0;

    for (const round of rounds) {
        console.log(`--- Processing ${round.round} ---`);

        // Batch Processing
        const BATCH_SIZE = 5;
        for (let i = 0; i < round.matches.length; i += BATCH_SIZE) {
            const batch = round.matches.slice(i, i + BATCH_SIZE);
            const promises = batch.map(m => scrapeMatch(browser, m.url, round.round));

            const results = await Promise.all(promises);
            results.forEach(r => {
                if (!r.error) allMatches.push(r);
                else {
                    // Even if error, maybe save it with empty events to avoid holes? 
                    // Best to push it so we have a record
                    console.log(`Failed: ${r.url}`);
                    allMatches.push(r);
                }
            });

            processedCount += results.length;
            console.log(`Progress: ${processedCount}/${totalMatches}`);

            // Intermediate Save
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allMatches, null, 2));
        }
    }

    await browser.close();
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allMatches, null, 2));
    console.log(`\nScraping complete! Data saved to ${OUTPUT_FILE}`);
}

run();
