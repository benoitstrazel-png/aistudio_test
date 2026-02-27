const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const MISSING_FILE = path.join(__dirname, '../src/data/players_missing_info.json');
const OUTPUT_FILE = path.join(__dirname, '../src/data/player_positions_tm.json');

// Helper delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const randomDelay = (min = 1500, max = 3500) => delay(Math.floor(Math.random() * (max - min + 1) + min));

async function run() {
    console.log("Starting Backfill of Missing Player Data...");

    // 1. Load Data
    if (!fs.existsSync(MISSING_FILE)) {
        console.error("FATAL: players_missing_info.json not found.");
        process.exit(1);
    }
    const missingData = JSON.parse(fs.readFileSync(MISSING_FILE, 'utf-8'));
    const playersToProcess = Object.keys(missingData);

    console.log(`Players to backfill: ${playersToProcess.length}`);

    if (playersToProcess.length === 0) {
        console.log("No missing data to process.");
        process.exit(0);
    }

    // Load existing database to update
    let db = {};
    if (fs.existsSync(OUTPUT_FILE)) {
        db = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
    }

    // 2. Launch Browser
    const browser = await puppeteer.launch({
        headless: false, // Visual debug
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'],
        defaultViewport: null
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    // Forward logs
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    // 3. Scrape Loop
    let count = 0;
    const normalize = str => str?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\./g, "").trim() || "";

    for (const playerName of playersToProcess) {
        count++;
        // Try to find team info if available in missingData (it might not be, depending on structure)
        // actually players_missing_info.json has existing structure which might not have team.
        // But we can check if there's team info if we loaded from stats originally. 
        // In the previous step, we just copied info. 
        // Let's rely on name search primarily. 
        let teamName = ""; // We don't have team easily available in that specific file unless we cross-ref, but let's try just name first or infer.

        // Actually, we can assume Ligue 1 context for search.

        console.log(`[${count}/${playersToProcess.length}] Processing: ${playerName}...`);

        const strategies = [
            `${playerName} transfermarkt profil`,
            `${playerName} joueur transfermarkt`,
            `${playerName} ligue 1 transfermarkt`
        ];

        let attempts = 0;
        const MAX_RETRIES = strategies.length;
        let success = false;

        // Skip if we already have it fully (double check)
        if (db[playerName] && db[playerName].birthDate && db[playerName].main && !db[playerName].error) {
            console.log(`   > Already has data, skipping.`);
            continue;
        }

        while (attempts < MAX_RETRIES && !success) {
            const query = strategies[attempts];
            attempts++;

            try {
                if (attempts === 1) console.log(`Searching: ${query}`);
                else console.log(`   > Retry: ${query}...`);

                const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&kl=fr-fr`;

                try {
                    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                } catch (navErr) {
                    console.warn(`   > Nav error on search: ${navErr.message}. Reloading...`);
                    await page.reload({ waitUntil: 'domcontentloaded' });
                }
                await randomDelay(2000, 4000);

                // Click first result
                const linkSelector = 'article h2 a, .react-results--main li h2 a, .result__a';
                try { await page.waitForSelector(linkSelector, { timeout: 5000 }); } catch (e) { }

                const firstLink = await page.$(linkSelector);

                if (firstLink) {
                    try {
                        await Promise.all([
                            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }),
                            firstLink.click()
                        ]);
                    } catch (navErr) {
                        console.warn(`   > Nav error after click: ${navErr.message}`);
                    }

                    await randomDelay();

                    // Extract Data
                    const data = await page.evaluate(() => {
                        const res = { main: null, other: [], birthDate: null, image: null };

                        // Regex Strategy: Find pattern "DD month YYYY"
                        const dateRegex = /(\d{1,2}\s+(?:janv\.|févr\.|mars|avr\.|mai|juin|juil\.|août|sept\.|oct\.|nov\.|déc\.|janvier|février|avril|juillet|septembre|octobre|novembre|décembre)[^\d]*\d{4})/i;

                        // Scrape from Info Table
                        const infoTable = document.querySelector('.info-table');
                        if (infoTable) {
                            const text = infoTable.innerText;
                            const match = text.match(dateRegex);
                            if (match) res.birthDate = match[1].trim();
                        }

                        // Scrape from Header
                        if (!res.birthDate) {
                            const header = document.querySelector('.data-header__headline-wrapper');
                            if (header) {
                                const params = header.parentElement.innerText;
                                const match = params.match(dateRegex);
                                if (match) res.birthDate = match[1].trim();
                            }
                        }

                        // Position
                        const labels = Array.from(document.querySelectorAll('.info-table__content--regular'));
                        labels.forEach(el => {
                            const txt = el.innerText.trim();
                            if (txt.includes('Position:')) {
                                const parts = txt.split(':');
                                if (parts.length > 1) res.main = parts[1].trim();
                                else if (el.nextElementSibling) res.main = el.nextElementSibling.innerText.trim();
                            }
                        });

                        if (!res.main) {
                            const mainBox = document.querySelector('.detail-position__position');
                            if (mainBox) res.main = mainBox.textContent.trim();
                        }

                        // Image
                        const img = document.querySelector('.data-header__profile-container img');
                        if (img && img.src && !img.src.includes('placeholder')) {
                            res.image = img.src;
                        }

                        return res;
                    });

                    if (data.main || data.birthDate) {
                        console.log(`   > Scraped: Pos=${data.main}, DOB=${data.birthDate}`);

                        // Update DB
                        db[playerName] = {
                            ...db[playerName],
                            ...data,
                            updated: new Date().toISOString(),
                            error: undefined, // Clear previous error
                            age: null // Let existing logic handle age calculation if needed, or clear it
                        };

                        // Also clear from missing list logically (though we just iterate)
                        success = true;
                    } else {
                        console.warn(`   > Failed to extract data.`);
                        if (attempts === MAX_RETRIES) {
                            // Keep error state
                            db[playerName] = { ...db[playerName], error: "Extraction failed (Retry)" };
                        }
                    }

                } else {
                    console.warn(`   > No search results.`);
                }

                if (count % 2 === 0) {
                    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(db, null, 2));
                }

            } catch (err) {
                console.error(`   > Error: ${err.message}`);
                try { await page.close(); } catch (e) { }
                await delay(2000);
            }
        }
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(db, null, 2));
    await browser.close();
    console.log("Backfill Complete.");
}

run();
