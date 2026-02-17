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

        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

        // Handle Cookies
        try {
            const acceptBtn = await page.waitForSelector('#onetrust-accept-btn-handler', { timeout: 3000 });
            if (acceptBtn) await acceptBtn.click();
        } catch (e) { }

        // Auto-scroll for dynamic content (events)
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
                const dateText = startTimeEl.innerText.trim(); // "17.01.2026 14:00"
                const [datePart, timePart] = dateText.split(' ');
                if (datePart && timePart) {
                    const [day, month, year] = datePart.split('.').map(Number);
                    const [hour, minute] = timePart.split(':').map(Number);
                    const matchDate = new Date(year, month - 1, day, hour, minute);
                    const now = new Date(); // Browser time
                    return { future: matchDate > now, reason: dateText, extractedDate: matchDate.toISOString() };
                }
            }
            return { future: false }; // Assume past if cant parse
        });

        // Debug info
        // console.log(`Date Check for ${url}:`, dateCheck);

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
                const player = el.querySelector('.smv__playerName')?.innerText.trim() || '';
                const text = el.innerText || '';
                const svg = el.querySelector('.smv__incidentIcon svg');
                const svgClass = (svg && svg.getAttribute('class')) || '';
                let type = 'Unknown';
                let detail = '';

                // Classify Event
                if (/\d+\s*-\s*\d+/.test(text)) {
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
                else if (svgClass.includes('substitution')) type = 'Substitution';

                const isHome = el.classList.contains('smv__homeParticipant');
                return { time: timeStr, player, type, detail, team: isHome ? homeTeam : awayTeam };
            }).filter(e => e.type !== 'Unknown');

            return { homeTeam, awayTeam, score: (sH && sA) ? `${sH}-${sA}` : "-", referee, events };
        });

        await page.close();
        return { ...data, round: roundInfo, url };
    } catch (error) {
        await page.close();
        return { url, round: roundInfo, error: error.message };
    }
}

async function run() {
    try {
        console.log("Starting Targeted Scrape (J21 & J22)...");
        const rounds = JSON.parse(fs.readFileSync(URLS_FILE, 'utf-8'));
        let allMatches = fs.existsSync(OUTPUT_FILE) ? JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8')) : [];
        console.log(`Loaded ${allMatches.length} existing history matches.`);

        // FILTER FOR J21 AND J22
        const targetRounds = rounds.filter(r => r.round === "Journée 21" || r.round === "Journée 22");
        console.log(`Found ${targetRounds.length} target rounds.`);

        if (targetRounds.length === 0) {
            console.log("No J21 or J22 found in urls file!");
            return;
        }

        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const save = (data) => {
            const temp = `${OUTPUT_FILE}.tmp`;
            fs.writeFileSync(temp, JSON.stringify(data, null, 2));
            fs.renameSync(temp, OUTPUT_FILE);
            console.log("Progress saved.");
        };

        let processed = 0;
        for (const round of targetRounds) {
            console.log(`Processing ${round.round}... (${round.matches.length} matches)`);
            for (const m of round.matches) {
                processed++;
                const id = m.id || extractId(m.url);

                const existingIndex = allMatches.findIndex(h => extractId(h.url) === id);
                const existing = existingIndex >= 0 ? allMatches[existingIndex] : null;

                if (existing && existing.score && existing.score !== "-" && !existing.error) {
                    console.log(`[${processed}] Already have valid data for ${id}. Skipping.`);
                    continue;
                }

                const url = m.url || `https://www.flashscore.fr/match/${id}/#/resume`;
                console.log(`[${processed}] Scraping ${id}...`);
                const res = await scrapeMatch(browser, url, round.round);

                if (res.skipped) {
                    console.log(`  -> Skipped: ${res.error}`);
                    continue;
                }

                if (res.score === "-" || res.error) {
                    console.log(`  -> Failed/Skipped: ${res.error || 'No Score'}`);
                    continue;
                }

                console.log(`  -> Success: ${res.homeTeam} ${res.score} ${res.awayTeam}`);

                if (existingIndex >= 0) allMatches[existingIndex] = res;
                else allMatches.push(res);

                if (processed % 2 === 0) save(allMatches);
                await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
            }
        }
        await browser.close();
        save(allMatches);
        console.log("Done.");
    } catch (e) { console.error(e); }
}
run();
