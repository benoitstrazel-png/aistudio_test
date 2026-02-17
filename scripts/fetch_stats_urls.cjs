const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const INPUT_FILE = path.join(__dirname, '../src/data/matches_urls_2025_2026.json');
const CONCURRENCY = 5; // Parallel tabs

// Delay function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
    console.log("Starting Stats URL Fetcher (Nested Structure Support)...");

    if (!fs.existsSync(INPUT_FILE)) {
        console.error("Input file not found:", INPUT_FILE);
        return;
    }

    let rounds = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));

    // Flatten list for processing but keep references to objects in 'rounds'
    const queue = [];

    rounds.forEach((roundObj, rIndex) => {
        if (!roundObj.matches) return;

        roundObj.matches.forEach((match, mIndex) => {
            // Check if we need to process this match
            if (!match.statsUrl) {
                queue.push({
                    matchRef: match, // Reference to modify in place
                    roundName: roundObj.round,
                    index: `${rIndex}-${mIndex}`
                });
            }
        });
    });

    console.log(`Found ${queue.length} matches to process out of total found in file.`);

    if (queue.length === 0) {
        console.log("All matches already have stats URLs.");
        return;
    }

    // Helper to save progress
    const saveMatches = () => {
        const temp = `${INPUT_FILE}.tmp`;
        fs.writeFileSync(temp, JSON.stringify(rounds, null, 2)); // Save the modified 'rounds' object
        try {
            fs.renameSync(temp, INPUT_FILE);
            console.log("  [SAVED] Progress saved to file.");
        } catch (e) {
            console.error("  [ERROR] Saving file:", e.message);
        }
    };

    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--window-size=1280,720'
        ]
    });

    // Worker function
    const processMatch = async (item) => {
        const match = item.matchRef;
        const page = await browser.newPage();

        // Log identifier
        const logPrefix = `[${item.roundName} | MatchID?]`;

        try {
            let matchId = null;

            // 1. Try extracting ID from URL
            if (match.url.includes('mid=')) {
                matchId = match.url.split('mid=')[1].split('&')[0].split('#')[0];
            } else {
                const m = match.url.match(/match\/([a-zA-Z0-9_\-]+)\//);
                if (m) matchId = m[1];
            }

            if (!matchId) {
                console.error(`  ${logPrefix} [ERROR] Could not extract ID from ${match.url}`);
                return;
            }

            // Improve log prefix
            const teams = match.teams ? `${match.teams.home} vs ${match.teams.away}` : `ID: ${matchId}`;
            // console.log(`  [Processing] ${teams} ...`);

            const targetUrl = `https://www.flashscore.fr/match/${matchId}/#/statistiques-du-match/0`;

            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

            // Wait for verification of redirect
            try {
                // If it redirects, the URL should eventually contain 'football' and key text
                await page.waitForFunction(() => window.location.href.includes('football') || window.location.href.includes(matchId), { timeout: 5000 });
            } catch (e) { }

            const finalUrl = page.url();

            // Extract base
            const baseUrl = finalUrl.split('#')[0];

            // Update match object
            match.statsUrl = `${baseUrl}#/statistiques-du-match/0`;
            match.statsUrlFirstHalf = `${baseUrl}#/statistiques-du-match/1`;
            match.statsUrlSecondHalf = `${baseUrl}#/statistiques-du-match/2`;

            console.log(`  [OK] ${teams}`);

        } catch (err) {
            console.error(`  [FAIL] ${item.roundName}: ${err.message}`);
        } finally {
            await page.close();
        }
    };

    // Parallel Processing
    let activeWorkers = 0;
    let index = 0;

    const next = async () => {
        if (index >= queue.length) return;

        const item = queue[index++];
        activeWorkers++;

        await processMatch(item);

        activeWorkers--;

        if (index % 10 === 0) saveMatches();

        if (index < queue.length) {
            await next();
        }
    };

    const workers = [];
    for (let i = 0; i < CONCURRENCY; i++) {
        workers.push(next());
    }

    await Promise.all(workers);

    saveMatches();
    console.log("Done.");
    await browser.close();
}

run();
