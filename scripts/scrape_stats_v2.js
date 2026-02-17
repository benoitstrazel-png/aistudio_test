import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

puppeteer.use(StealthPlugin());

// Configuration
const URLS_FILE = path.join(__dirname, '../src/data/matches_urls_2025_2026.json');
const OUTPUT_FILE = path.join(__dirname, '../src/data/match_stats_2025_2026.json');

// Stats to collect (Exact keys requested by user)
const TARGET_STATS = [
    "Expected Goals (xG)",
    "Possession de balle",
    "Tirs totaux",
    "Tirs cadrés",
    "Grosses occasions",
    "Corners",
    "Cartons jaunes",
    "xG cadrés (xGOT)",
    "Tirs non cadrés",
    "Tirs contrés",
    "Tirs dans la surface",
    "Tirs en dehors de la surface",
    "Montant touché",
    "Buts de la tête",
    "Touches dans la surface adverse",
    "Passes entre les lignes réussies",
    "Coup francs",
    "Expected Assists (xA)",
    "Touche",
    "Fautes",
    "Duels remportés",
    "Dégagements",
    "Interceptions",
    "Erreurs menant à un tir",
    "Erreurs menant à un but",
    "Arrêts du gardien",
    "xGot subis",
    "Buts évités"
];

// Helper delay
const delay = (min, max) => {
    if (typeof max === 'undefined') max = min;
    return new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1) + min)));
};

const handleCookies = async (page) => {
    try {
        const btn = await page.$('#onetrust-reject-all-handler');
        if (btn && await btn.isVisible()) {
            await btn.click();
            await delay(500, 1000);
        }
    } catch (e) { }
};

const forceCleanup = async (page) => {
    try {
        await page.evaluate(() => {
            // Remove known cookie/ad IDs
            const sensitiveIds = [
                'onetrust-banner-sdk',
                'onetrust-consent-sdk',
                'qc-cmp2-container',
                'didomi-host'
            ];
            sensitiveIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.remove();
            });
        });
    } catch (e) {
        console.log("Cleanup error:", e);
    }
};

const clickStatsTab = async (page) => {
    try {
        console.log("  [Navigation] Checking for Stats tab...");

        // 1. Check if we are already seeing stats
        // Warning: "Possession" and "Tirs" are also on the Summary/Resume page!
        // We must check for something exclusive to the Full Stats tab, like "Fautes", "Coup francs", "Passes".
        const alreadyOnStats = await page.evaluate(() => {
            const text = document.body.innerText;
            // Check for deep stats
            return text.includes('Fautes') || text.includes('Fouls') || text.includes('Passes');
        });

        if (alreadyOnStats) {
            console.log("  [Navigation] Full Stats (Fautes/Passes) already visible. Skipping click.");
            return;
        }

        // 2. Click using evaluate to avoid passing handles across contexts
        const clicked = await page.evaluate(() => {
            // Priority 1: Role tab with text STATS
            const tabs = Array.from(document.querySelectorAll('button[role="tab"]'));
            const statTab = tabs.find(t => {
                const txt = t.innerText ? t.innerText.trim().toUpperCase() : '';
                return txt === 'STATS' || txt === 'STATISTIQUES';
            });
            if (statTab) {
                statTab.click();
                return true;
            }

            // Priority 2: Link with proper href
            const links = Array.from(document.querySelectorAll('a[href*="/statistiques"]'));
            if (links.length > 0) {
                links[0].click();
                return true;
            }

            return false;
        });

        if (clicked) {
            console.log("  [Navigation] Clicked Stats tab via DOM.");
            await delay(1000, 2000);
        } else {
            console.log("  [Navigation] Stats tab not found.");
        }
    } catch (e) {
        console.error("  [Navigation] Error clicking stats tab:", e.message);
    }
};

const clickShowMore = async (page) => {
    // Disabled intentionally to reduce instability
    return;
};

const MAX_RETRIES = 2;

async function scrapeStatsPage(page, url) {
    if (!url) return {};

    let attempt = 0;
    while (attempt <= MAX_RETRIES) {
        attempt++;
        try {
            // console.log(`  [Scraper] Attempt ${attempt} for ${url}`);
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

            // Increased wait for headless reliability. 
            await delay(3000, 5000);

            // Capture logs setup (once per page load)
            // ... (removed to avoid clutter or re-add if really needed, simplified here)

            await forceCleanup(page);
            await delay(500, 1000);

            await clickStatsTab(page);

            // Robust polling for content with global timeout
            // "Possession" is on the Summary page too. We need something specific to the Stats tab.
            // "Fautes" (Fouls) or "Passes" usually appear only in the full stats list.
            let found = false;
            for (let i = 0; i < 10; i++) {
                try {
                    const bodyText = await page.evaluate(() => document.body.innerText);
                    // Check for "Fautes" or "Fouls" or "Passes"
                    if (bodyText.includes('Fautes') || bodyText.includes('Fouls') || bodyText.includes('Passes')) {
                        found = true;
                        break;
                    }
                } catch (e) {
                    // Ignore execution context errors during reload
                }
                await delay(1000);
            }

            if (!found) {
                console.log("  [Navigation] Timeout waiting for 'Fautes' text (Full Stats). Retrying click...");
                await clickStatsTab(page);
                await delay(2000);
                // IF we didn't find it, maybe we throw to trigger retry? 
                // Or just proceed and return empty (fail soft).
                // Let's retry if it's a network/load issue
                if (attempt < MAX_RETRIES) continue;
            } else {
                // console.log("  [Navigation] Full Stats content found.");
            }

            await delay(1000, 1500);

            const { stats, logs } = await page.evaluate((targetStats) => {
                const logs = [];
                const stats = {};
                const allDivs = document.querySelectorAll('div');

                allDivs.forEach(div => {
                    if (div.innerText && div.innerText.includes('\n') && div.childElementCount <= 5) {
                        const lines = div.innerText.split('\n').map(l => l.trim()).filter(l => l);
                        if (lines.length === 3) {
                            const [valHome, label, valAway] = lines;
                            const matchedKey = targetStats.find(k => label.toLowerCase() === k.toLowerCase() || label.toLowerCase().includes(k.toLowerCase()));
                            if (matchedKey) {
                                stats[matchedKey] = { home: valHome, away: valAway };
                            }
                        }
                    }
                });
                return { stats, logs };
            }, TARGET_STATS);

            // Successfully scraped
            return { stats, logs };

        } catch (error) {
            console.error(`  [Error] Attempt ${attempt} failed: ${error.message}`);
            if (error.message.includes('Session closed') || error.message.includes('Target closed')) {
                // Critical failure, maybe restart browser? For now just rethrow to skip
                throw error;
            }
            if (attempt > MAX_RETRIES) return {};
            await delay(2000);
        }
    }
    return {};
}

async function run() {
    console.log("Starting Scraper v2...");

    // 1. Load URLs
    if (!fs.existsSync(URLS_FILE)) {
        console.error("URLs file not found!");
        return;
    }
    const rounds = JSON.parse(fs.readFileSync(URLS_FILE, 'utf-8'));
    let allMatchesToScrape = [];

    rounds.forEach(r => {
        if (r.matches) {
            r.matches.forEach(m => {
                if (m.statsUrl) {
                    // Attach round info to the match object
                    m.round = r.round;
                    allMatchesToScrape.push(m);
                }
            });
        }
    });

    console.log(`Found ${allMatchesToScrape.length} matches with stats URLs.`);

    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1920,1080'
        ]
    });
    const page = await browser.newPage();
    // Stealth improvements (User Agent only)
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    let finalData = {};
    if (fs.existsSync(OUTPUT_FILE)) {
        try {
            finalData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
            const initialCount = Object.keys(finalData).length;

            // CLEANING STEP: Remove matches with incomplete stats (<= 5 keys)
            // The user observed matches with only 3 stats (summary). We want 20+.
            let purgedCount = 0;
            Object.keys(finalData).forEach(url => {
                const m = finalData[url];
                if (m && m.stats && m.stats.fullTime) {
                    const k = Object.keys(m.stats.fullTime).length;
                    if (k <= 5) { // Threshold for "Summary only"
                        delete finalData[url];
                        purgedCount++;
                    }
                } else {
                    delete finalData[url]; // Corrupt
                    purgedCount++;
                }
            });

            console.log(`Loaded ${initialCount} matches. Purged ${purgedCount} incomplete matches (<= 5 stats).`);
            console.log(`Remaining valid matches: ${Object.keys(finalData).length}`);

        } catch (e) {
            console.error("Error loading existing file, starting fresh.");
        }
    }

    let processed = 0;

    // Process ALL matches
    const matchesToProcess = allMatchesToScrape;

    for (const match of matchesToProcess) {
        processed++;

        // Resume logic: Skip if we already have VALID stats and METADATA
        const existing = finalData[match.url];
        if (existing && existing.stats && Object.keys(existing.stats.fullTime).length > 5) {
            // Check if metadata is present
            if (existing.date && existing.id && existing.timestamp) {
                // console.log(`[${processed}/${allMatchesToScrape.length}] Skipping ${match.id} (Complete)`);
                continue;
            } else {
                console.log(`[${processed}/${allMatchesToScrape.length}] Reprocessing ${match.url} (Missing metadata: Date/ID)`);
            }
        }

        console.log(`[${processed}/${allMatchesToScrape.length}] Processing ${match.id} ...`);

        const matchStats = {
            id: match.id,
            url: match.url,
            date: match.date,
            timestamp: match.timestamp,
            round: match.round,
            stats: {
                fullTime: {},
                firstHalf: {},
                secondHalf: {}
            }
        };

        // Use the explicit statsUrl from input if available
        // Input: "https://.../football/.../?mid=ID#/statistiques-du-match/0"
        let baseUrl = "";

        if (match.statsUrl) {
            // Remove the trailing /0, /1, /2 or hash part to get base
            // Usually ends with "/statistiques-du-match/0"
            // We want everything up to "/statistiques-du-match"
            const parts = match.statsUrl.split('/statistiques-du-match');
            if (parts.length > 0) {
                baseUrl = parts[0] + '/statistiques-du-match';
            } else {
                // Fallback
                baseUrl = match.statsUrl;
            }
        } else {
            // Fallback to ID construction
            baseUrl = `https://www.flashscore.fr/match/${match.id}/#/statistiques-du-match`;
        }

        // 2. Extract Date/Time from page if missing
        try {
            if (!matchStats.date || !matchStats.timestamp) {
                // Selector for date on match page: .duelParticipant__startTime
                const rawDate = await page.evaluate(() => {
                    const el = document.querySelector('.duelParticipant__startTime');
                    return el ? el.innerText : null;
                });

                if (rawDate) {
                    // rawDate example: "25.01.2026 20:45"
                    matchStats.date = rawDate;

                    // Parse timestamp
                    // French format: dd.mm.yyyy HH:MM
                    const [dStr, tStr] = rawDate.split(' ');
                    const [day, month, year] = dStr.split('.');
                    const [hour, min] = tStr.split(':');

                    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(min));
                    matchStats.timestamp = d.getTime();
                }
            }
        } catch (e) {
            console.log("  [Warn] Could not extract date from page:", e.message);
        }

        // 3. Fallback ID extraction
        if (!matchStats.id) {
            const m = match.url.match(/[?&]mid=([^&]+)/);
            if (m) {
                matchStats.id = m[1];
            } else {
                // Try from URL path: /match/ID/
                const m2 = match.url.match(/\/match\/([a-zA-Z0-9\-_]+)/);
                if (m2 && m2[1] && m2[1] !== 'football') {
                    matchStats.id = m2[1];
                }
            }
        }


        // Add Year to Date if missing
        // Format "25.01. 20:45" -> "2026-01-25 20:45"
        // Heuristic: Month 01-07 -> 2026, Month 08-12 -> 2025
        let fullDate = matchStats.date || match.date;
        let ts = matchStats.timestamp || match.timestamp;

        // Apply heuristic ONLY if we have a short date string (e.g. from match list) and NOT a full scraped date
        // Scraped date "25.01.2026 20:45" is long (~16 chars). Short is "25.01. 20:45" (~12 chars)
        const dateToCheck = matchStats.date || match.date;

        if (dateToCheck && dateToCheck.includes('.') && dateToCheck.length < 15) {
            const parts1 = dateToCheck.split('.');
            if (parts1.length >= 2) {
                const dayStr = parts1[0];
                // Handling "01. 20:45" or similar variations
                // The rest usually is "01. 20:45" -> split by ". "

                // Better split approach: match regex
                // "25.01. 20:45"
                const regex = /^(\d{2})\.(\d{2})\.\s+(\d{2}:\d{2})$/;
                const mMatch = dateToCheck.match(regex);

                if (mMatch) {
                    const dayStr = mMatch[1];
                    const monthStr = mMatch[2];
                    const timeStr = mMatch[3];

                    const m = parseInt(monthStr, 10);
                    const y = (m >= 8) ? 2025 : 2026;
                    fullDate = `${y}-${monthStr.padStart(2, '0')}-${dayStr.padStart(2, '0')} ${timeStr}`;

                    const [h, min] = timeStr.split(':');
                    ts = new Date(y, m - 1, parseInt(dayStr), parseInt(h), parseInt(min)).getTime();
                }
            }
        }

        matchStats.date = fullDate;
        matchStats.timestamp = ts;


        // Scrape 3 tabs - Full Time (0), 1st Half (1), 2nd Half (2)
        const scrapings = [
            { key: 'fullTime', suffix: '/0' },
            { key: 'firstHalf', suffix: '/1' },
            { key: 'secondHalf', suffix: '/2' }
        ];

        for (const item of scrapings) {
            const targetUrl = `${baseUrl}${item.suffix}`;
            console.log(`  -> Scraping ${item.key}: ${targetUrl}`);

            const result = await scrapeStatsPage(page, targetUrl);
            matchStats.stats[item.key] = result.stats || {};

            // Check count
            const k = Object.keys(result.stats || {}).length;
            if (k > 0 && k < 5) {
                console.warn(`  [WARNING] Only ${k} stats found for ${item.key}. Possible Summary page?`);
            }
        }

        // Store result
        finalData[match.url] = matchStats;

        const countFT = Object.keys(matchStats.stats.fullTime).length;
        const count1H = Object.keys(matchStats.stats.firstHalf).length;
        const count2H = Object.keys(matchStats.stats.secondHalf).length;

        console.log(`  -> Stats trouvées :`);
        console.log(`     Full Time   : ${countFT} keys`);
        console.log(`     1st Half    : ${count1H} keys`);
        console.log(`     2nd Half    : ${count2H} keys`);

        if (countFT < 5) { // Threshold raised: if we have < 5 stats, it's likely a failure (summary page)
            console.error("  [STOP] Trop peu de stats trouvées (<5). Arrêt du script pour vérification.");
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalData, null, 2));
            await browser.close();
            process.exit(1);
        }

        // Save periodically
        if (processed % 5 === 0) {
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalData, null, 2));
        }

        // Anti-bot delay
        await delay(1000, 2000);
    }

    await browser.close();

    // Final Save
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalData, null, 2));
    console.log(`Done! Saved ${Object.keys(finalData).length} matches to ${OUTPUT_FILE}`);
}

run();
