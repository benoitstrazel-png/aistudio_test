const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const LINEUPS_FILE = path.join(__dirname, '../src/data/lineups_2025_2026.json');
const STATS_FILE = path.join(__dirname, '../src/data/match_stats_2025_2026.json');

// Helper for random delays to simulate human behavior
const randomDelay = (min, max) => new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1) + min)));

async function scrapeMatch(matchData) {
    let { url, metadata, statsUrl, statsUrlFirstHalf, statsUrlSecondHalf } = matchData;
    console.log(`DEBUG: scrapeMatch called with url=${url}`);

    // Ensure URL is absolute for navigation
    if (url && !url.includes('http')) {
        url = `https://www.flashscore.fr/match/${url}`;
    }

    console.log('--- Processing Match ---');
    console.log(`    ${metadata.homeTeam} vs ${metadata.awayTeam}`);

    // Launch options for stealth
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--window-size=1920,1080'
        ]
    });

    const page = await browser.newPage();
    page.on('console', msg => console.log('  [BROWSER]', msg.text()));

    const results = {
        metadata: metadata,
        stats: { fullTime: {}, firstHalf: {}, secondHalf: {} }
    };

    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });

        // Helper to check/accept cookies
        const handleCookies = async () => {
            try {
                // console.log("  [INFO] Checking cookies...");
                const bannerBtn = await page.$('#onetrust-reject-all-handler');
                if (bannerBtn && await bannerBtn.isVisible()) {
                    await bannerBtn.click();
                    await randomDelay(1000, 2000);
                    return;
                }

                // Fallback text search
                const clicked = await page.evaluate(() => {
                    const searchTerms = ["tout refuser", "refuser", "continuer sans accepter", "j'accepte", "accepter et fermer"];
                    for (const term of searchTerms) {
                        const xpath = `//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${term}")] | //div[@role='button' and contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${term}")]`;
                        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                        if (result.singleNodeValue && result.singleNodeValue.offsetParent !== null) {
                            result.singleNodeValue.click();
                            return true;
                        }
                    }
                    return false;
                });
                if (clicked) await randomDelay(1000, 2000);
            } catch (e) { }
        };

        // Scrape Logic Definition via evaluate
        const scrapeStats = async () => {
            return await page.evaluate(() => {
                const s = {};
                const allDivs = document.querySelectorAll('div');
                const KNOWN_STATS = [
                    "Expected Goals (xG)", "Possession de balle", "Tirs totaux", "Tirs cadrés",
                    "Tirs non cadrés", "Tirs contrés", "Tirs dans la surface", "Tirs en dehors de la surface",
                    "Arrêts du gardien", "Corners", "Fautes", "Passes", "Tacles", "Grosses occasions",
                    "Cartons jaunes", "Cartons rouges", "Hors-jeu"
                ];

                allDivs.forEach(div => {
                    if (div.childElementCount > 5) return;
                    const text = div.innerText;
                    if (!text || text.length > 200) return;
                    const lines = text.split('\n').map(t => t.trim()).filter(t => t);

                    if (lines.length === 3) {
                        const [valHome, label, valAway] = lines;
                        const isNumber = str => /^[\d%.,\s-]+$/.test(str);
                        if (isNumber(label)) return;

                        const isKnown = KNOWN_STATS.some(k => label.toLowerCase().includes(k.toLowerCase()));
                        const valsAreNumbers = isNumber(valHome) && isNumber(valAway);

                        if (isKnown || (valsAreNumbers && label.length > 2)) {
                            const cleanLabel = KNOWN_STATS.find(k => label.toLowerCase().includes(k.toLowerCase())) || label;
                            if (!s[cleanLabel]) {
                                // console.log(`[SCRAPER] Found candidate: ${cleanLabel}`);
                                s[cleanLabel] = [valHome, valAway];
                            }
                        }
                    }
                });

                // XPath Fallback
                if (Object.keys(s).length < 3) {
                    KNOWN_STATS.forEach(label => {
                        if (s[label]) return;
                        const xpath = `//div[contains(text(), "${label}")] | //span[contains(text(), "${label}")]`;
                        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                        const el = result.singleNodeValue;
                        if (el) {
                            let parent = el.parentElement;
                            for (let i = 0; i < 4; i++) {
                                if (!parent) break;
                                const lines = parent.innerText.split('\n').map(x => x.trim()).filter(x => x);
                                if (lines.length === 3 && lines[1].includes(label)) {
                                    s[label] = [lines[0], lines[2]];
                                    break;
                                }
                                parent = parent.parentElement;
                            }
                        }
                    });
                }
                return s;
            });
        };

        // Execution Logic
        let parts = [];
        if (statsUrl) {
            console.log("  [INFO] Using Direct Stats URLs");
            parts = [
                { key: 'fullTime', url: statsUrl },
                { key: 'firstHalf', url: statsUrlFirstHalf },
                { key: 'secondHalf', url: statsUrlSecondHalf }
            ];

            // Initial nav to handle cookies
            if (parts[0].url) {
                await page.goto(parts[0].url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                await randomDelay(1000, 2000);
                await handleCookies();
            }

        } else {
            // Fallback Logic
            // console.log("  [INFO] Using Legacy URL & Tabs");
            let root = url.split(/[?#]/)[0];
            if (!root.endsWith('/')) root += '/';
            const startUrl = root + '#/resume';
            console.log(`  [INFO] Navigating to: ${startUrl}`);

            parts = [
                { key: 'fullTime', label: 'Match' },
                { key: 'firstHalf', label: '1ère Mi-temps' },
                { key: 'secondHalf', label: '2ème Mi-temps' }
            ];

            await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await randomDelay(1000, 2000);
            await handleCookies();

            // Initial check if we are on stats? Usually #/resume is summary.
            // We need to click "Statistiques" tab primarily.
            const clickStatsTab = async () => {
                return await page.evaluate(() => {
                    const tabs = Array.from(document.querySelectorAll('a[href*="statistiques"], div[role="tab"], button[role="tab"]'));
                    const t = tabs.find(x => x.innerText.toLowerCase().includes('statistiques'));
                    if (t) { t.click(); return true; }
                    return false;
                });
            };
            // First navigation usually needs this
            await clickStatsTab();
            await randomDelay(1000, 1500);
        }

        for (const p of parts) {
            if (!p.url && !p.label) continue;

            console.log(`  [PART] Processing ${p.key}...`);

            if (statsUrl && p.url) {
                if (page.url() !== p.url) {
                    await page.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                    await randomDelay(1500, 2500);
                }
            } else if (!statsUrl) {
                // Switch tabs via buttons
                if (p.key !== 'fullTime') {
                    await page.evaluate((lbl) => {
                        const btns = Array.from(document.querySelectorAll('a, button, div[role="button"]'));
                        const b = btns.find(x => x.innerText.includes(lbl));
                        if (b) b.click();
                    }, p.label);
                    await randomDelay(1500, 2000);
                }
            }

            // Scrape
            let currentStats = await scrapeStats();

            // Voir Plus
            if (Object.keys(currentStats).length > 0 && Object.keys(currentStats).length < 15) {
                // console.log("    -> Checking 'Voir plus'...");
                const clicked = await page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('a, button, div[role="button"], span[role="button"]'));
                    const showMore = buttons.find(b => b.innerText && (b.innerText.toLowerCase().includes('voir plus') || b.innerText.toLowerCase().includes('afficher plus')));
                    if (showMore) { showMore.click(); return true; }
                    return false;
                });
                if (clicked) {
                    await randomDelay(2000, 3000);
                    const newStats = await scrapeStats();
                    if (Object.keys(newStats).length >= Object.keys(currentStats).length) {
                        currentStats = newStats;
                    }
                }
            }

            results.stats[p.key] = currentStats;
            console.log(`    -> Found ${Object.keys(currentStats).length} stats.`);
        }

    } catch (e) {
        console.error("Scraping Match Error:", e.message);
    } finally {
        await browser.close();
    }
    return results;
}

async function run() {
    try {
        console.log("Starting Enriched Scraper (Stealth Mode)...");
        if (!fs.existsSync(LINEUPS_FILE)) throw new Error("Lineups file not found.");

        const lineups = JSON.parse(fs.readFileSync(LINEUPS_FILE, 'utf8'));
        let stats = {};
        if (fs.existsSync(STATS_FILE)) {
            try { stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')); } catch (e) { }
        }

        // Helper: Atomic Save
        const saveStats = () => {
            const temp = `${STATS_FILE}.tmp`;
            fs.writeFileSync(temp, JSON.stringify(stats, null, 2));
            fs.renameSync(temp, STATS_FILE);
            console.log("  [SAVED]");
        };

        // Filter: Scrape if no stats OR incomplete stats (only xG/Poss/Shots = <= 3 keys)
        const matchesToScrape = lineups.filter(m => {
            const existing = stats[m.url];

            if (!existing) return true;

            const fullTime = existing.fullTime || (existing.stats && existing.stats.fullTime);

            // If no data at all
            if (!fullTime || Object.keys(fullTime).length === 0) return true;

            // If incomplete (<= 3 stats means likely only xG, Possession, Shots)
            if (Object.keys(fullTime).length <= 3) {
                // console.log(`  [INFO] Re-scraping ${m.teams.home} vs ${m.teams.away} (Only ${Object.keys(fullTime).length} stats found)`);
                return true;
            }

            return false;
        });

        console.log(`Found ${matchesToScrape.length} matches to enrich.`);

        // Process in batches
        const BATCH_SIZE = 1;
        for (let i = 0; i < matchesToScrape.length; i += BATCH_SIZE) {
            const batch = matchesToScrape.slice(i, i + BATCH_SIZE);
            console.log(`\n--- Batch ${Math.floor(i / BATCH_SIZE) + 1} ---`);

            for (const match of batch) {
                const combinedMatchData = {
                    ...match,
                    metadata: {
                        homeTeam: match.teams?.home || "Unknown",
                        awayTeam: match.teams?.away || "Unknown",
                        round: match.round || ""
                    }
                };

                const data = await scrapeMatch(combinedMatchData);

                // Save if valid
                if (data && data.stats && Object.keys(data.stats.fullTime).length > 0) {
                    stats[match.url] = {
                        metadata: data.metadata,
                        // Flatten stats to match existing file structure
                        ...data.stats
                    };
                    saveStats();
                } else {
                    console.log("  [WARN] No stats found or blocked.");
                }

                // Delay between matches
                await randomDelay(3000, 5000);
            }

            // Break between batches
            if (i + BATCH_SIZE < matchesToScrape.length) {
                console.log("Taking a short break...");
                await randomDelay(5000, 10000);
            }
        }
        console.log("Done.");

    } catch (err) {
        console.error("Fatal Error:", err);
    }
}

run();
