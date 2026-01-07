const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const LINEUPS_FILE = path.join(__dirname, '../src/data/lineups_2025_2026.json');
const STATS_FILE = path.join(__dirname, '../src/data/match_stats_2025_2026.json');

async function scrapeMatch(baseUrl, metadata) {
    const browser = await puppeteer.launch({
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1200 });
    const results = {
        metadata: metadata, // Use passed metadata
        stats: { fullTime: {}, firstHalf: {}, secondHalf: {} }
    };

    try {
        const root = baseUrl.split('?')[0];
        const query = baseUrl.split('?')[1] ? '?' + baseUrl.split('?')[1] : '';

        console.log(`\nProcessing ${metadata.homeTeam} vs ${metadata.awayTeam} (${metadata.round})...`);

        // 1. Just navigate once to ensure overlays are handled if needed (optional but good for consistency)
        await page.goto(root + 'resume/' + query, { waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 2000));

        // Handle Overlays (Cookie/Tooltip)
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const closeBtn = btns.find(b => b.innerText.toLowerCase().includes('refuser') || b.id.includes('reject'));
            if (closeBtn) closeBtn.click();
        });

        // 3. Stats (Direct URLs for Match, 1st Half, 2nd Half)
        const periods = [
            { suffix: '0/', key: 'fullTime' },
            { suffix: '1/', key: 'firstHalf' },
            { suffix: '2/', key: 'secondHalf' }
        ];

        for (const p of periods) {
            console.log(`  - Navigating to stats/${p.suffix}...`);
            await page.goto(root + 'resume/stats/' + p.suffix + query, { waitUntil: 'domcontentloaded' });
            await new Promise(r => setTimeout(r, 2000));

            const periodStats = await page.evaluate(() => {
                const s = {};
                const rows = document.querySelectorAll('[data-testid="wcl-statistics"]');
                rows.forEach(r => {
                    const lines = r.innerText.split('\n').map(x => x.trim()).filter(x => x);
                    if (lines.length >= 3) {
                        const catIdx = lines.findIndex((l, i) => i > 0 && i < lines.length - 1 && !/^[\d%.,\(\)\/]+$/.test(l));
                        if (catIdx !== -1) {
                            const label = lines[catIdx];
                            const homeVal = lines.slice(0, catIdx).join(' ');
                            const awayVal = lines.slice(catIdx + 1).join(' ');
                            s[label] = [homeVal, awayVal];
                        } else if (lines.length === 3) {
                            s[lines[1]] = [lines[0], lines[2]];
                        }
                    }
                });
                return s;
            });
            results.stats[p.key] = periodStats;
            console.log(`    -> ${Object.keys(periodStats).length} categories found.`);
        }
    } catch (e) {
        console.error("Scraping error:", e);
    } finally {
        await browser.close();
    }
    return results;
}

async function run() {
    console.log("Starting Optimized Enrichment...");

    if (!fs.existsSync(LINEUPS_FILE)) {
        console.error("No lineups file found at:", LINEUPS_FILE);
        return;
    }

    const lineups = JSON.parse(fs.readFileSync(LINEUPS_FILE, 'utf8'));
    let stats = fs.existsSync(STATS_FILE) ? JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')) : {};

    // Get URL of matches that don't have stats yet or have empty round
    const matchesToScrape = lineups.filter(m => {
        const existing = stats[m.url];
        return !existing || !existing.metadata || !existing.metadata.round;
    });

    console.log(`Found ${matchesToScrape.length} matches to process (missing or incomplete).`);

    // Only process a small batch to avoid being blocked if needed, 
    // but here we'll try to process what's missing if it's reasonable.
    // Let's limit to 18 (2 matchdays) per run to be safe.
    const BATCH_SIZE = 18;
    const batch = matchesToScrape.slice(0, BATCH_SIZE);

    if (batch.length === 0) {
        console.log("All matches are already enriched.");
        return;
    }

    for (const match of batch) {
        const metadata = {
            homeTeam: match.teams?.home || "Unknown",
            awayTeam: match.teams?.away || "Unknown",
            round: match.round || ""
        };

        const d = await scrapeMatch(match.url, metadata);

        if (Object.keys(d.stats.fullTime).length > 0) {
            stats[match.url] = {
                metadata: d.metadata,
                ...d.stats
            };
            fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
            console.log(`- Saved results for ${metadata.homeTeam} vs ${metadata.awayTeam} (${metadata.round})`);
        } else {
            console.log(`- Failed to retrieve stats for ${metadata.homeTeam} vs ${metadata.awayTeam}`);
        }
    }

    console.log(`\nEnrichment task completed for ${batch.length} matches.`);
    if (matchesToScrape.length > BATCH_SIZE) {
        console.log(`Remaining matches to process: ${matchesToScrape.length - BATCH_SIZE}. Run again to continue.`);
    }
}

run();
