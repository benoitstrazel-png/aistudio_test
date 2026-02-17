const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const PLAYERS_FILE = path.join(__dirname, '../src/data/real_players.json');
const OUTPUT_FILE = path.join(__dirname, '../src/data/player_positions_tm.json');

// Helper delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const randomDelay = (min = 2000, max = 5000) => delay(Math.floor(Math.random() * (max - min + 1) + min));

async function run() {
    console.log("Starting Transfermarkt Scraper (via DuckDuckGo)...");

    // 1. Load Players
    if (!fs.existsSync(PLAYERS_FILE)) {
        console.error("FATAL: real_players.json not found.");
        process.exit(1);
    }
    const playersData = JSON.parse(fs.readFileSync(PLAYERS_FILE, 'utf-8'));

    // Flatten player list
    let allPlayers = [];
    for (const [team, roster] of Object.entries(playersData)) {
        roster.forEach(p => {
            allPlayers.push({ name: p.name, team });
        });
    }
    console.log(`Loaded ${allPlayers.length} players to process.`);

    // 2. Load Existing Data (Resumption)
    let outputData = {};
    if (fs.existsSync(OUTPUT_FILE)) {
        try {
            outputData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
            console.log(`Resuming... Found ${Object.keys(outputData).length} existing entries.`);
        } catch (e) {
            console.warn("Could not parse existing output file, starting fresh.");
        }
    }

    // 3. Launch Browser
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    // 4. Process Loop
    let count = 0;
    for (const p of allPlayers) {
        // Skip if already scraped AND has valid data (not error)
        // If error, maybe retry? For now, skip if key exists.
        if (outputData[p.name] && !outputData[p.name].error) {
            continue;
        }

        console.log(`[${count + 1}/${allPlayers.length}] Processing: ${p.name} (${p.team})...`);

        try {
            // A. Search on DuckDuckGo
            const query = `site:transfermarkt.fr ${p.name} ${p.team}`;
            const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&kl=fr-fr`; // Force FR locale

            await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });

            await randomDelay(1500, 2500);

            // B. Click first result
            // DDG selectors can change, try multiple common ones
            const linkSelector = 'article h2 a, .react-results--main li h2 a, .result__a';

            let firstLink = await page.$(linkSelector);
            // Sometimes DDG shows "No results found"

            if (firstLink) {
                await firstLink.click();
                try {
                    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 });
                } catch (e) {
                    console.log("   > Navigation timeout or redirect (continuing check)...");
                }
            } else {
                console.warn(`No link found for ${p.name}`);
                await page.screenshot({ path: `debug_fail_${p.name.replace(/[^a-z0-9]/gi, '_')}.png` });
                outputData[p.name] = { error: "No Search Result" };
                continue;
            }

            await randomDelay(2000, 4000);

            // C. Extract Data on Transfermarkt Page
            const data = await page.evaluate(() => {
                const result = { main: null, other: [] };

                // Helper to find text in detail boxes (Standard Profile)
                const labels = Array.from(document.querySelectorAll('.info-table__content--regular'));

                labels.forEach((el, idx) => {
                    const text = el.textContent.trim();
                    // "Position:" or "Position gén."
                    if (text.includes('Position') && !text.includes('Autre')) {
                        const val = el.nextElementSibling?.textContent.trim();
                        // Sometimes the value is in the SAME element if no sibling, but usually sibling
                        if (val) result.main = val;
                    }
                    if (text === 'Position principale:') {
                        const val = el.nextElementSibling?.textContent.trim();
                        if (val) result.main = val;
                    }
                    if (text.includes('Autre(s) position(s)') || text.includes('Position(s) secondaire(s)')) {
                        const val = el.nextElementSibling?.textContent.trim();
                        if (val) result.other = val.split(',').map(s => s.trim());
                    }
                });

                // Strategy 2: Header Box (often has specific class)
                if (!result.main) {
                    const mainBox = document.querySelector('.detail-position__position');
                    if (mainBox) result.main = mainBox.textContent.trim();
                }

                return result;
            });

            if (data.main) {
                console.log(`   > Found: ${data.main} | Other: ${data.other ? data.other.join(', ') : 'None'}`);
                outputData[p.name] = data;
            } else {
                console.warn(`   > Failed to extract position for ${p.name}`);
                outputData[p.name] = { error: "Extraction failed (Selector mismatch)" };
            }

            // Save incrementally
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2));

        } catch (e) {
            console.error(`   > Error processing ${p.name}:`, e.message);
        }

        count++;
        // Periodic extra wait
        if (count % 20 === 0) await delay(5000);
        await randomDelay(2000, 4000);
    }

    await browser.close();
    console.log("Scraping Complete.");
}

run();
