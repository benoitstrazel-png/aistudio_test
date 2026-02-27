const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const URLS_FILE = path.join(__dirname, '../src/data/matches_urls_2025_2026.json');
const HISTORY_FILE = path.join(__dirname, '../src/data/matches_history_detailed.json');

function extractId(url) {
    if (!url) return null;
    const shortMatch = url.match(/\/match\/([A-Za-z0-9]+)/);
    if (shortMatch && shortMatch[1] && shortMatch[1].length === 8) return shortMatch[1];
    const midMatch = url.match(/[?&]mid=([A-Za-z0-9]+)/);
    if (midMatch && midMatch[1]) return midMatch[1];
    return url;
}

// Corrected Scrape Function
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
        return { url, round: roundInfo, error: error.message };
    }
}

async function run() {
    console.log("Starting TARGETED scrape for missing substitutions...");

    const allMatches = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));

    // Identify matches missing substitutions entirely
    const matchesToRescrape = allMatches.filter(m =>
        m.events && m.events.length > 0 && !m.events.some(e => e.type === 'Substitution')
    );

    // Some actual 0-0 matches might really have 0 events... but usually there is at least a sub or a yellow card.
    // If a match literally had 0 subs, it would be caught here, but 19 matches is way too high for 0 real subs.

    console.log(`Found ${matchesToRescrape.length} matches missing substitution events.`);
    if (matchesToRescrape.length === 0) {
        console.log("No missing substitutions found. Exiting.");
        return;
    }

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

    for (let i = 0; i < matchesToRescrape.length; i++) {
        const m = matchesToRescrape[i];
        console.log(`[${i + 1}/${matchesToRescrape.length}] Re-scraping: ${m.url} (${m.round})`);
        const res = await scrapeMatch(browser, m.url, m.round);

        if (res.error || res.score === "-") {
            console.warn(`  -> Failed/Skipped: ${res.url}`);
        } else {
            console.log(`  -> Success: Found ${res.events.length} events (Subs: ${res.events.some(e => e.type === 'Substitution')})`);
            // Update the match in the array
            const index = allMatches.findIndex(h => extractId(h.url) === extractId(m.url));
            if (index !== -1) {
                // Ensure we don't overwrite with a 0-event array unnecessarily
                if (res.events && res.events.length > 0) {
                    allMatches[index] = res;
                }
            }
        }
        await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000)); // Delay to not get blocked
    }

    await browser.close();
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(allMatches, null, 2));
    console.log("Done. Updated history file.");
}

run();
