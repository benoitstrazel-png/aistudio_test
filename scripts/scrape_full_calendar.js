
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const URLS_FILE = path.join(__dirname, '../src/data/matches_urls_2025_2026.json');
const CALENDAR_URL = 'https://www.flashscore.fr/football/france/ligue-1/calendrier/';

async function scrapeFullCalendar() {
    console.log("Launching browser to scrape FULL calendar...");
    const browser = await puppeteer.launch({
        headless: true, // Use headless for speed, verify if it gets blocked
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set viewport to see buttons
    await page.setViewport({ width: 1280, height: 800 });

    try {
        await page.goto(CALENDAR_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        // 1. Accept Cookies
        try {
            const acceptBtn = await page.$('#onetrust-accept-btn-handler');
            if (acceptBtn) {
                console.log("Accepting cookies...");
                await acceptBtn.click();
            }
        } catch (e) { }

        // 2. Load All Matches (Click "Show more" until gone)
        // Selector for "Show more": .event__more or similar.
        // On Flashscore it's often a link/div with specific class.
        // Let's inspect similar selector usually `a.event__more`.
        // We will try repeatedly.

        console.log("Loading all matches...");
        let clicks = 0;
        while (clicks < 20) { // Safety limit
            try {
                // Wait a bit for potential load
                await new Promise(r => setTimeout(r, 1000));

                // Specific selector for Flashscore "Show more matches"
                const showMore = await page.$('.event__more');
                if (showMore) {
                    // Check if visible
                    const isVisible = await page.evaluate(el => {
                        const style = window.getComputedStyle(el);
                        return style && style.display !== 'none' && style.visibility !== 'hidden';
                    }, showMore);

                    if (isVisible) {
                        console.log("Clicking 'Montrer plus de matchs'...");
                        await page.evaluate(el => el.click(), showMore);
                        // Wait for spinner or content expansion? 
                        // Usually adds more DOM nodes.
                        await new Promise(r => setTimeout(r, 2000));
                        clicks++;
                    } else {
                        break;
                    }
                } else {
                    break;
                }
            } catch (e) {
                console.log("Error clicking more:", e.message);
                break;
            }
        }
        console.log(`Loaded full page after ${clicks} clicks.`);

        // 3. Extract Schedule
        const schedule = await page.evaluate(() => {
            const data = [];
            let currentRound = null;
            let currentMatches = [];

            const rows = document.querySelectorAll('.sportName.soccer > div');

            rows.forEach(row => {
                if (row.classList.contains('event__round')) {
                    // Save previous round
                    if (currentRound) {
                        data.push({ round: currentRound, matches: currentMatches });
                    }
                    currentRound = row.textContent.trim();
                    currentMatches = [];
                } else if (row.classList.contains('event__match')) {
                    if (currentRound) {
                        const id = row.id.split('_').pop();
                        // Time
                        const timeEl = row.querySelector('.event__time');
                        const dateStr = timeEl ? timeEl.textContent.trim() : "Unknown"; // "17.08. 20:45"

                        // Parse timestamp if possible?
                        // Flashscore generally doesn't expose clean timestamp in DOM text, 
                        // but maybe we can infer year.
                        // Assuming season 2025-2026.
                        // If date is "06.02. 20:00", we need to guess year.
                        // Logic: Aug-Dec -> 2025, Jan-May -> 2026.

                        let timestamp = 0;
                        if (dateStr.length >= 5) { // "dd.MM."
                            const [d, m] = dateStr.split('.').map(s => parseInt(s));
                            let year = 2026;
                            if (m >= 8) year = 2025;
                            // Time might be "20:45"
                            let h = 20, min = 0;
                            const parts = dateStr.split(' ');
                            if (parts.length > 1) {
                                const t = parts[1].split(':'); // "20:45"
                                if (t.length === 2) { h = parseInt(t[0]); min = parseInt(t[1]); }
                            }
                            timestamp = new Date(year, m - 1, d, h, min).getTime();
                        }

                        const url = `https://www.flashscore.fr/match/${id}/#/resume`;

                        currentMatches.push({
                            url,
                            id,
                            date: dateStr,
                            timestamp,
                            statsUrl: `https://www.flashscore.fr/match/${id}/#/statistiques-du-match/0`,
                            statsUrlFirstHalf: `https://www.flashscore.fr/match/${id}/#/statistiques-du-match/1`,
                            statsUrlSecondHalf: `https://www.flashscore.fr/match/${id}/#/statistiques-du-match/2`
                        });
                    }
                }
            });
            // Push last
            if (currentRound) data.push({ round: currentRound, matches: currentMatches });

            return data;
        });

        console.log(`Scraped ${schedule.length} rounds.`);

        // Log round names for debug
        schedule.forEach(r => console.log(` - ${r.round}: ${r.matches.length} matches`));

        // 4. Save to File
        // We only want Journée 1 to 34 (Ligue 1 has 34 rounds with 18 teams)
        // Remove "Barrages" or other weird rounds if any
        const ligue1Rounds = schedule.filter(r => r.round.includes('Journée'));

        console.log(`Saving ${ligue1Rounds.length} Ligue 1 rounds.`);
        fs.writeFileSync(URLS_FILE, JSON.stringify(ligue1Rounds, null, 2));
        console.log(`Saved to ${URLS_FILE}`);

    } catch (e) {
        console.error("Scraping failed:", e);
    } finally {
        await browser.close();
    }
}

scrapeFullCalendar();
