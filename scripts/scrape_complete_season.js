
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const URLS_FILE = path.join(__dirname, '../src/data/matches_urls_2025_2026.json');

const RESULTS_URL = 'https://www.flashscore.fr/football/france/ligue-1/resultats/';
const FIXTURES_URL = 'https://www.flashscore.fr/football/france/ligue-1/calendrier/';

async function scrapePage(browser, url, type) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    console.log(`Navigating to ${type}: ${url}`);

    let roundsData = [];

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Accept Cookies
        try {
            const acceptBtn = await page.$('#onetrust-accept-btn-handler');
            if (acceptBtn) await acceptBtn.click();
        } catch (e) { }

        // Click "Show more" logic
        console.log(`[${type}] Looking for 'Show more' button...`);
        let clicks = 0;
        const start = Date.now();

        while (Date.now() - start < 60000) { // Max 60s
            try {
                // Find by text content because class might be obscure
                const moreBtn = await page.evaluateHandle(() => {
                    const links = Array.from(document.querySelectorAll('a'));
                    return links.find(el => el.textContent.includes('Montrer plus de match'));
                });

                if (moreBtn && moreBtn.asElement()) {
                    // Check visibility
                    const visible = await page.evaluate(el => {
                        const style = window.getComputedStyle(el);
                        return style && style.display !== 'none' && style.visibility !== 'hidden';
                    }, moreBtn);

                    if (visible) {
                        console.log(`[${type}] Found button, clicking...`);
                        await moreBtn.click();
                        await new Promise(r => setTimeout(r, 3000)); // Wait longer
                        clicks++;
                    } else {
                        console.log(`[${type}] Button found but hidden/inactive.`);
                        break;
                    }
                } else {
                    console.log(`[${type}] No 'Montrer plus' button found.`);
                    break;
                }
            } catch (e) {
                console.log("Click error:", e.message);
                break;
            }
        }
        console.log(`[${type}] Clicked 'Show more' ${clicks} times.`);

        // Extract
        roundsData = await page.evaluate(() => {
            const data = [];
            let currentRound = null;
            let currentMatches = [];

            const rows = document.querySelectorAll('.sportName.soccer > div');
            rows.forEach(row => {
                if (row.classList.contains('event__round')) {
                    if (currentRound) {
                        data.push({ round: currentRound, matches: currentMatches });
                    }
                    currentRound = row.textContent.trim();
                    currentMatches = [];
                } else if (row.classList.contains('event__match')) {
                    if (currentRound) {
                        const id = row.id.split('_').pop();
                        const timeEl = row.querySelector('.event__time');
                        const dateStr = timeEl ? timeEl.textContent.trim() : "";

                        let timestamp = 0;
                        if (dateStr.length >= 5) {
                            const [d, m] = dateStr.split('.').map(s => parseInt(s));
                            let year = 2026;
                            if (m >= 8) year = 2025;

                            let h = 20, min = 0;
                            const parts = dateStr.split(' ');
                            if (parts.length > 1) {
                                const t = parts[1].split(':');
                                if (t.length === 2) { h = parseInt(t[0]); min = parseInt(t[1]); }
                            }
                            timestamp = new Date(year, m - 1, d, h, min).getTime();
                        }

                        currentMatches.push({
                            url: `https://www.flashscore.fr/match/${id}/#/resume`,
                            id,
                            date: dateStr,
                            timestamp,
                            statsUrl: `https://www.flashscore.fr/match/${id}/#/statistiques-du-match/0`
                        });
                    }
                }
            });
            if (currentRound) data.push({ round: currentRound, matches: currentMatches });
            return data;
        });

    } catch (e) {
        console.error(`[${type}] Error:`, e);
    } finally {
        await page.close();
    }
    return roundsData;
}

async function run() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const results = await scrapePage(browser, RESULTS_URL, "RESULTS");
        const fixtures = await scrapePage(browser, FIXTURES_URL, "FIXTURES");

        console.log(`Results: ${results.length} rounds. Fixtures: ${fixtures.length} rounds.`);

        const roundMap = new Map();
        const process = (list) => {
            list.forEach(r => {
                if (!r.round.includes('Journée')) return;
                roundMap.set(r.round, r);
            });
        };

        process(results);
        process(fixtures);

        const merged = Array.from(roundMap.values());
        merged.sort((a, b) => {
            const na = parseInt(a.round.match(/\d+/)[0]);
            const nb = parseInt(b.round.match(/\d+/)[0]);
            return na - nb;
        });

        console.log(`Total Merged: ${merged.length} rounds.`);
        merged.forEach(r => console.log(` ${r.round}: ${r.matches.length} matches`));

        fs.writeFileSync(URLS_FILE, JSON.stringify(merged, null, 2));
        console.log(`Saved to ${URLS_FILE}`);

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
}

run();
