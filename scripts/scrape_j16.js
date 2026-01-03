
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

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 150;
                const timer = setInterval(() => {
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= 2000 || totalHeight >= document.body.scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });

        await new Promise(r => setTimeout(r, 2000));

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

                if (/\d+\s*-\s*\d+/.test(text)) {
                    type = 'Goal';
                    const lowerText = text.toLowerCase();
                    if (lowerText.includes('(csc)') || lowerText.includes('own goal')) detail = 'Own Goal';
                    else if (lowerText.includes('penalty')) detail = 'Penalty';
                    else {
                        const parenthesized = text.match(/\(([^)]+)\)/);
                        if (parenthesized) detail = `Assist: ${parenthesized[1]}`;
                    }
                }
                else if (svgClass.includes('yellowCard')) type = 'Yellow Card';
                else if (svgClass.includes('redCard')) type = 'Red Card';
                else if (svgClass.includes('substitution')) type = 'Substitution';
                else if (svgClass.includes('penalty-missed')) { type = 'Other'; detail = 'Pénalty manqué'; }

                if (el.querySelector('.smv__subIcon--penalty')) { type = 'Goal'; detail = 'Penalty'; }
                if (el.querySelector('.smv__subIcon--ownGoal')) detail = 'Own Goal';

                const isHome = el.classList.contains('smv__homeParticipant');
                return { time, player, type, detail, isHome };
            }).filter(e => e.type !== 'Unknown');
        });

        const processedEvents = events.map(e => ({
            ...e,
            team: e.isHome ? matchData.homeTeam : matchData.awayTeam,
            isHome: undefined
        }));

        await page.close();
        return { ...matchData, round: roundInfo, events: processedEvents, url };

    } catch (error) {
        console.error(`Error scraping ${url}:`, error.message);
        await page.close();
        return { url, round: roundInfo, error: error.message, events: [] };
    }
}

async function run() {
    const rawUrls = JSON.parse(fs.readFileSync(URLS_FILE, 'utf-8'));
    const j16Round = rawUrls.find(r => r.round === "Journée 16");

    if (!j16Round) {
        console.error("Journée 16 not found in URLs file.");
        return;
    }

    const browser = await puppeteer.launch({ headless: "new" });
    const j16Matches = [];

    console.log(`Scraping ${j16Round.matches.length} matches for Journée 16...`);

    for (const m of j16Round.matches) {
        const result = await scrapeMatch(browser, m.url, "Journée 16");
        j16Matches.push(result);
    }

    await browser.close();

    // Merge into history
    let history = [];
    if (fs.existsSync(OUTPUT_FILE)) {
        history = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
    }

    j16Matches.forEach(m => {
        if (!history.some(h => h.url === m.url)) {
            history.push(m);
        }
    });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(history, null, 2));
    console.log(`\nJournée 16 merge complete! ${j16Matches.length} matches added.`);
}

run();
