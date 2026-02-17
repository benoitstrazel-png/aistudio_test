
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const URLS_FILE = path.join(__dirname, '../src/data/matches_urls_2025_2026.json');
const OUTPUT_FILE = path.join(__dirname, '../src/data/matches_history_detailed.json');

function extractId(url) {
    if (!url) return null;
    const shortMatch = url.match(/\/match\/([A-Za-z0-9]+)/);
    if (shortMatch && shortMatch[1] && shortMatch[1].length === 8) return shortMatch[1];
    const midMatch = url.match(/[?&]mid=([A-Za-z0-9]+)/);
    if (midMatch && midMatch[1]) return midMatch[1];
    return url;
}

async function scrapeMatch(browser, url, roundInfo) {
    const page = await browser.newPage();
    try {
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'media', 'font', 'stylesheet'].includes(req.resourceType())) req.abort();
            else req.continue();
        });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

        try {
            const acceptBtn = await page.waitForSelector('#onetrust-accept-btn-handler', { timeout: 3000 });
            if (acceptBtn) await acceptBtn.click();
        } catch (e) { }

        // Auto-scroll for dynamic content
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                let distance = 200;
                let timer = setInterval(() => {
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= 2000 || totalHeight >= document.body.scrollHeight) {
                        clearInterval(timer); resolve();
                    }
                }, 100);
            });
        });
        await new Promise(r => setTimeout(r, 1500));

        // CHECK DATE BEFORE SCRAPING
        const dateCheck = await page.evaluate(() => {
            const startTimeEl = document.querySelector('.duelParticipant__startTime');
            if (startTimeEl) {
                const dateText = startTimeEl.innerText.trim();
                const [datePart, timePart] = dateText.split(' ');
                if (datePart && timePart) {
                    const [day, month, year] = datePart.split('.').map(Number);
                    const [hour, minute] = timePart.split(':').map(Number);
                    const matchDate = new Date(year, month - 1, day, hour, minute);
                    const now = new Date();
                    if (matchDate > now) return { future: true, reason: dateText };
                }
            }
            return { future: false };
        });

        if (dateCheck.future) {
            await page.close();
            return { url, round: roundInfo, error: `Future match: ${dateCheck.reason}`, skipped: true };
        }

        const data = await page.evaluate(() => {
            const homeTeam = document.querySelector('.duelParticipant__home .participant__participantName')?.innerText.trim();
            const awayTeam = document.querySelector('.duelParticipant__away .participant__participantName')?.innerText.trim();
            const sH = document.querySelector('.detailScore__wrapper span:nth-child(1)')?.innerText.trim();
            const sA = document.querySelector('.detailScore__wrapper span:nth-child(3)')?.innerText.trim();
            const refereeContainer = Array.from(document.querySelectorAll('.wcl-summaryMatchInformation_U4gpU'))
                .find(item => item.textContent.toUpperCase().includes('ARBITRE'));
            const referee = refereeContainer?.querySelector('.wcl-infoValue_grawU')?.innerText.trim() || 'N/A';

            const rows = Array.from(document.querySelectorAll('.smv__participantRow'));
            const events = rows.map(el => {
                const timeStr = el.querySelector('.smv__timeBox')?.innerText.trim().replace("'", "") || '';
                const playerNames = Array.from(el.querySelectorAll('.smv__playerName')).map(p => p.innerText.trim());
                const text = el.innerText || '';

                const svg = el.querySelector('.smv__incidentIcon svg');
                const svgClass = (svg && svg.getAttribute('class')) || '';
                const subIcon = el.querySelector('.smv__incidentIconSub');

                let type = 'Unknown';
                let detail = '';
                let player = playerNames[0] || '';

                // Classify Event
                if (subIcon) {
                    type = 'Substitution';
                    // playerNames[0] is In, playerNames[1] is Out
                    player = playerNames[0];
                    if (playerNames[1]) detail = `Out: ${playerNames[1]}`;
                }
                else if (/\d+\s*-\s*\d+/.test(text)) {
                    type = 'Goal';
                    if (text.toLowerCase().includes('(csc)')) detail = 'Own Goal';
                    else if (text.toLowerCase().includes('penalty')) detail = 'Penalty';
                    else {
                        const m = text.match(/\(([^)]+)\)/);
                        if (m) detail = `Assist: ${m[1]}`;
                    }
                }
                else if (svgClass.includes('yellowCard')) type = 'Yellow Card';
                else if (svgClass.includes('redCard')) type = 'Red Card';
                else if (svgClass.includes('substitution')) type = 'Substitution'; // Fallback

                const isHome = el.classList.contains('smv__homeParticipant');
                return { time: timeStr, player, type, detail, team: isHome ? homeTeam : awayTeam };
            }).filter(e => e.type !== 'Unknown');

            return { homeTeam, awayTeam, score: (sH && sA) ? `${sH}-${sA}` : "-", referee, events };
        });

        await page.close();
        return { ...data, round: roundInfo, url };
    } catch (error) {
        await page.close();
        return { url, round: roundInfo, error: error.message }; // Return ERROR Message
    }
}

async function run() {
    try {
        console.log("Starting run() with Sub detection...");
        const rounds = JSON.parse(fs.readFileSync(URLS_FILE, 'utf-8'));
        let allMatches = fs.existsSync(OUTPUT_FILE) ? JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8')) : [];
        console.log(`Loaded ${allMatches.length} existing matches.`);

        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const save = (data) => {
            const temp = `${OUTPUT_FILE}.tmp`;
            fs.writeFileSync(temp, JSON.stringify(data, null, 2));
            fs.renameSync(temp, OUTPUT_FILE);
            console.log("Progress Saved.");
        };

        let processed = 0;
        for (const round of rounds) {
            console.log(`Checking ${round.round}...`);
            for (const m of round.matches) {
                processed++;
                const id = extractId(m.url);
                const existing = allMatches.find(h => extractId(h.url) === id);

                const hasSubs = existing && existing.events && existing.events.some(e => e.type === 'Substitution');

                if (existing && existing.score && existing.score !== "-" && !existing.error && existing.events?.length > 0 && hasSubs) continue;

                console.log(`[${processed}] Scrape needed for ${id} (Missing Subs: ${!hasSubs})`);
                const res = await scrapeMatch(browser, m.url, round.round);

                // Fix: Log the error if present
                if (res.score === "-" || res.error) {
                    console.error(`  -> Skipped Error: ${res.error || 'No Score'}`);
                    continue;
                }

                console.log(`  -> Success: ${res.events.length} events found.`);

                if (existing) allMatches[allMatches.indexOf(existing)] = res;
                else allMatches.push(res);

                if (processed % 5 === 0) save(allMatches);
                await new Promise(r => setTimeout(r, 500));
            }
        }
        await browser.close();
        save(allMatches);
        console.log("Done.");
    } catch (e) { console.error(e); }
}
run();
