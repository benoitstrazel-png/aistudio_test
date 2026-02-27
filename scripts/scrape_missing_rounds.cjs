
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const URLS_FILE = path.join(__dirname, '../src/data/matches_urls_2025_2026.json');
const HISTORY_FILE = path.join(__dirname, '../src/data/matches_history_detailed.json');

// Copied Scrape Function
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

        // Handle Cookies
        try {
            const acceptBtn = await page.waitForSelector('#onetrust-accept-btn-handler', { timeout: 3000 });
            if (acceptBtn) await acceptBtn.click();
        } catch (e) { }

        // Auto-scroll
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
                const time = el.querySelector('.smv__timeBox')?.innerText.trim().replace("'", "") || '';
                const playerNames = Array.from(el.querySelectorAll('.smv__playerName')).map(p => p.innerText.trim());
                const text = el.innerText || '';
                const svg = el.querySelector('.smv__incidentIcon svg');
                const svgClass = (svg && svg.getAttribute('class')) || '';
                const subIcon = el.querySelector('.smv__incidentIconSub');

                let type = 'Unknown';
                let detail = '';
                let player = playerNames[0] || '';

                if (subIcon) {
                    type = 'Substitution';
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
                else if (svgClass.includes('substitution')) type = 'Substitution';
                const isHome = el.classList.contains('smv__homeParticipant');
                return { time, player, type, detail, team: isHome ? homeTeam : awayTeam };
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
    console.log("Starting TARGETED scrape for J6 and J7...");

    const rounds = JSON.parse(fs.readFileSync(URLS_FILE, 'utf-8'));
    const allMatches = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));

    // Filter rounds
    const targetRounds = rounds.filter(r => r.round === 'Journée 6' || r.round === 'Journée 7');
    console.log(`Found ${targetRounds.length} target rounds.`);

    // Identify missing URLs
    const existingUrls = new Set(allMatches.map(m => m.url));
    const missingMatches = [];

    targetRounds.forEach(r => {
        r.matches.forEach(m => {
            if (!existingUrls.has(m.url)) {
                missingMatches.push({ ...m, round: r.round });
            }
        });
    });

    console.log(`Missing Matches to Scrape: ${missingMatches.length}`);
    if (missingMatches.length === 0) {
        console.log("No missing matches found in J6/J7. Exiting.");
        return;
    }

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

    for (const m of missingMatches) {
        console.log(`Scraping missing: ${m.url} (${m.round})`);
        const res = await scrapeMatch(browser, m.url, m.round);

        if (res.error || res.score === "-") {
            console.warn(`Failed/Skipped: ${res.url}`);
        } else {
            allMatches.push(res);
            console.log(`[SAVED] ${res.homeTeam} vs ${res.awayTeam}`);
        }
    }

    await browser.close();
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(allMatches, null, 2));
    console.log("Done. Updated history file.");
}

run();
