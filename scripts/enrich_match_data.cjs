const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const LINEUPS_FILE = path.join(__dirname, '../src/data/lineups_2025_2026.json');
const STATS_FILE = path.join(__dirname, '../src/data/match_stats_2025_2026.json');

async function scrapeMatch(baseUrl) {
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1200 });
    const results = { matchInfo: {}, stats: { fullTime: {}, firstHalf: {}, secondHalf: {} } };

    try {
        const root = baseUrl.split('?')[0];
        const query = baseUrl.split('?')[1] ? '?' + baseUrl.split('?')[1] : '';

        console.log(`\nProcessing ${root}...`);

        // 1. Metadata (Résumé)
        await page.goto(root + 'resume/' + query, { waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 4000));

        // Handle Overlays (Cookie/Tooltip)
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const closeBtn = btns.find(b => b.innerText.toLowerCase().includes('refuser') || b.id.includes('reject'));
            if (closeBtn) closeBtn.click();
            const tooltipBtn = btns.find(b => b.innerText.toUpperCase().includes('COMPRENDS') || b.innerText.toUpperCase().includes('GOT IT'));
            if (tooltipBtn) tooltipBtn.click();
        });

        results.matchInfo = await page.evaluate(() => {
            const t = document.body.innerText;
            const res = {};
            const ref = t.match(/Arbitre\s*:\s*([^\n]+)/i);
            const std = t.match(/Stade\s*:\s*([^\n]+)/i);
            if (ref) res.referee = ref[1].trim();
            if (std) res.stadium = std[1].split('(')[0].trim();
            const time = t.match(/(\d{2}\.\d{2}\.\d{4}\s\d{2}:\d{2})/);
            if (time) res.dateTime = time[1];
            return res;
        });

        // 2. Coaches (Compositions)
        await page.goto(root + 'resume/compositions/' + query, { waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 3000));
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await new Promise(r => setTimeout(r, 1000));
        results.matchInfo.coaches = await page.evaluate(() => {
            const spans = Array.from(document.querySelectorAll('span, strong')).filter(s => s.className.includes('wcl-name'));
            return spans.length >= 2 ? { home: spans[spans.length - 2].innerText.trim(), away: spans[spans.length - 1].innerText.trim() } : { home: null, away: null };
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
            await new Promise(r => setTimeout(r, 3000));

            // Scroll to load all stats
            await page.evaluate(() => {
                window.scrollTo(0, 1000);
            });
            await new Promise(r => setTimeout(r, 500));

            const periodStats = await page.evaluate(() => {
                const s = {};
                const rows = document.querySelectorAll('[data-testid="wcl-statistics"]');
                rows.forEach(r => {
                    const lines = r.innerText.split('\n').map(x => x.trim()).filter(x => x);
                    if (lines.length >= 3) {
                        // Category name is typically the middle element or the non-numeric one
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
    const lineups = JSON.parse(fs.readFileSync(LINEUPS_FILE, 'utf8'));
    let stats = fs.existsSync(STATS_FILE) ? JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')) : {};

    // Process target matches
    const targetUrls = [
        "https://www.flashscore.fr/match/football/lorient-jgNAYRGi/lyon-2akflumR/?mid=Qc01MMcM",
        "https://www.flashscore.fr/match/football/auxerre-MTLr36WA/metz-4v0yqlWc/?mid=Cj4QK9MH",
        "https://www.flashscore.fr/match/football/le-havre-CIEe04GT/paris-fc-0OEHEprs/?mid=4Q0IMVi5"
    ];

    for (const url of targetUrls) {
        const d = await scrapeMatch(url);
        const match = lineups.find(l => l.url === url);
        if (match) {
            match.matchInfo = d.matchInfo;
            stats[url] = d.stats;
            fs.writeFileSync(LINEUPS_FILE, JSON.stringify(lineups, null, 2));
            fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
            console.log(`- Saved results for ${match.teams.home} vs ${match.teams.away}`);
        }
    }
    console.log("\nEnrichment task completed.");
}

run();
