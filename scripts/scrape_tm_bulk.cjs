const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const STATS_FILE = path.join(__dirname, '../src/data/player_stats_calculated.json');
const OUTPUT_FILE = path.join(__dirname, '../src/data/player_positions_tm.json');
const CSV_FILE = path.join(__dirname, '../missing_tm_data.csv');

// Helper delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const randomDelay = (min = 1500, max = 3500) => delay(Math.floor(Math.random() * (max - min + 1) + min));

async function run() {
    console.log("Starting Bulk Player Enrichment (Position + DOB)...");

    // 1. Load Data
    if (!fs.existsSync(STATS_FILE)) {
        console.error("FATAL: player_stats_calculated.json not found.");
        process.exit(1);
    }
    const statsData = JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));

    // Flatten stats player list
    let allPlayers = Object.values(statsData).flat();
    console.log(`Total Players loaded: ${allPlayers.length}`);

    // Load Cache
    let existingData = {};
    if (fs.existsSync(OUTPUT_FILE)) {
        existingData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
    }

    // 2. Filter Players Needing Enrichment
    const normalize = str => str?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\./g, "").trim() || "";

    const toProcess = allPlayers.filter(p => {
        const key = normalize(p.name);
        // Prioritize full name match from existing data if available
        let bestKey = key;
        if (existingData[p.name]) bestKey = p.name;
        else if (existingData[key]) bestKey = key;

        const entry = existingData[bestKey];

        // If no entry exists, we definitely need to scrape
        if (!entry) return true;

        // If critical data is missing, we scrape
        if (!entry.birthDate) return true;
        if (!entry.main) return true;

        // If existing data has error, we retry (unless it's a permanent failure, but let's try)
        if (entry.error) return true;

        return false;
    });

    console.log(`Players needing enrichment: ${toProcess.length}`);
    if (toProcess.length === 0) {
        console.log("All players already enriched!");
        process.exit(0);
    }

    // 3. Launch Browser
    const browser = await puppeteer.launch({
        headless: false, // Visual debug
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'],
        defaultViewport: null
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    // Forward logs
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    // Initialize CSV
    if (!fs.existsSync(CSV_FILE)) {
        fs.writeFileSync(CSV_FILE, 'Player Name,Team,Status\n');
    }

    // 4. Scrape Loop
    let count = 0;

    // We can prioritize based on minutesPlayed if we want, but let's just go through list
    // Sort by minutes descending (most important players first)
    toProcess.sort((a, b) => (b.minutesPlayed || 0) - (a.minutesPlayed || 0));

    for (const p of toProcess) {
        count++;
        console.log(`[${count}/${toProcess.length}] Processing: ${p.name} (${p.team})...`);

        // Clean name for search
        // "Chevalier L." -> "Lucas Chevalier" logic hard to guess, but "Chevalier Transfermarkt" usually works better than "Chevalier L." 
        // Let's try removing initial if it's at end
        let searchName = p.name.replace(/\s+[A-Z]\.$/, ''); // "Chevalier L." -> "Chevalier"
        // Also remove parenthesis
        searchName = searchName.replace(/\(.*\)/, '').trim();

        // Specific overrides if needed (can add map here)
        const MANUAL_SEARCH_OVERRIDES = {
            "Tabibou D.": "Dehmaine Tabibou Nantes",
            "Diatta K.": "Krepin Diatta Monaco",
            "Sanson M.": "Morgan Sanson Nice",
            "Balerdi L.": "Leonardo Balerdi Marseille",
            "Hogsberg L.": "Lukas Hogsberg Strasbourg", // Assuming Lukas, verifying via search if needed, but Hogsberg Strasbourg is safe
            "Abdul Samed S.": "Salis Abdul Samed transfermarkt",
            "Dina Ebimbe J.": "Junior Dina Ebimbe"
        };

        let overrideQuery = MANUAL_SEARCH_OVERRIDES[p.name];
        if (overrideQuery) {
            console.log(`   > Using Override for ${p.name}: ${overrideQuery}`);
        }

        // Search Strategy Logic
        const strategies = [
            // 0. Manual Override (if exists)
            ...(overrideQuery ? [`${overrideQuery} transfermarkt profil`] : []),
            // 1. Cleaned Name + "transfermarkt profil"
            `${searchName} transfermarkt profil`,
            // 2. Last Name (Cleaned) + Team Name + "transfermarkt" (Good for "Balerdi L." -> "Balerdi Marseille")
            `${searchName} ${p.team} transfermarkt profil`,
            // 3. Normalized Name + "transfermarkt"
            `${normalize(p.name)} transfermarkt profil`
        ];

        let attempts = 0;
        const MAX_RETRIES = strategies.length;
        let success = false;

        while (attempts < MAX_RETRIES && !success) {

            const query = strategies[attempts]; // Use strategy based on attempt index
            attempts++;

            try {
                if (attempts === 1) console.log(`Searching (Strategy ${attempts}): ${query}`);
                else console.log(`   > Retry (Strategy ${attempts}) for ${p.name}: ${query}...`);

                const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&kl=fr-fr`;

                try {
                    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                } catch (navErr) {
                    console.warn(`   > Nav error on search: ${navErr.message}. Reloading page...`);
                    await page.reload({ waitUntil: 'domcontentloaded' });
                }
                await randomDelay(2000, 4000);

                // Click first result
                const linkSelector = 'article h2 a, .react-results--main li h2 a, .result__a';

                // Safety check for selector
                try {
                    await page.waitForSelector(linkSelector, { timeout: 5000 });
                } catch (e) {
                    // ignore, maybe no results
                }

                const firstLink = await page.$(linkSelector);

                if (firstLink) {
                    // Promise.all for click + navigation is safer
                    try {
                        await Promise.all([
                            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }),
                            firstLink.click()
                        ]);
                    } catch (navErr) {
                        console.warn(`   > Nav error after click: ${navErr.message}. Continuing if on new page...`);
                    }

                    await randomDelay();

                    // Extract Data
                    const data = await page.evaluate(() => {
                        const res = { main: null, other: [], birthDate: null, image: null, age: null };

                        // Regex Strategy: Find pattern "DD month YYYY"
                        // French months: janv.|févr.|mars|avr.|mai|juin|juil.|août|sept.|oct.|nov.|déc.
                        // Also full names: janvier, février...
                        const dateRegex = /(\d{1,2}\s+(?:janv\.|févr\.|mars|avr\.|mai|juin|juil\.|août|sept\.|oct\.|nov\.|déc\.|janvier|février|avril|juillet|septembre|octobre|novembre|décembre)[^\d]*\d{4})/i;

                        // Scrape from Info Table
                        const infoTable = document.querySelector('.info-table');
                        if (infoTable) {
                            const text = infoTable.innerText;
                            const match = text.match(dateRegex);
                            if (match) {
                                res.birthDate = match[1].trim();
                            }
                        }

                        // Scrape from Header (sometimes better)
                        if (!res.birthDate) {
                            const header = document.querySelector('.data-header__headline-wrapper');
                            if (header) {
                                const params = header.parentElement.innerText; // Get wider context
                                const match = params.match(dateRegex);
                                if (match) res.birthDate = match[1].trim();
                            }
                        }

                        // Position (Try exact label first)
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
                        // Save to cache
                        const nKey = normalize(p.name);
                        let targetKey = nKey;
                        // Prefer existing key (e.g. "Sarr M.") over normalized one ("sarr m")
                        if (existingData[p.name]) targetKey = p.name;

                        existingData[targetKey] = {
                            ...existingData[targetKey], // keep old data
                            ...data,
                            updated: new Date().toISOString()
                        };
                        success = true; // Mark as success to exit loop
                    } else {
                        console.warn(`   > Failed to extract data.`);
                        // Only log to CSV if it's the last attempt
                        if (attempts === MAX_RETRIES) {
                            fs.appendFileSync(CSV_FILE, `"${p.name}","${p.team}","Extraction Failed"\n`);
                        }
                    }

                } else {
                    console.warn(`   > No search results.`);
                    if (attempts === MAX_RETRIES) {
                        fs.appendFileSync(CSV_FILE, `"${p.name}","${p.team}","No Search Results"\n`);
                    }
                    // Continue to next strategy
                }

                // Save Cache periodically
                if (count % 5 === 0) {
                    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(existingData, null, 2));
                }

            } catch (err) {
                console.error(`   > Error (Strategy ${attempts}): ${err.message}`);
                // Use a new page on critical error
                try {
                    await page.close();
                } catch (e) { }
                try {
                    // Re-assign page variable? process scope issue.
                    // Easier to just reload or restart browser, but simple reload might fix "detached frame"
                    // The "page" variable is in outer scope, so we can re-create it if we want, but let's try strict navigation waits first.
                } catch (e) { }

                if (attempts === MAX_RETRIES) {
                    fs.appendFileSync(CSV_FILE, `"${p.name}","${p.team}","Error: ${err.message}"\n`);
                }
                await delay(2000);
            }
        } // end while retry
    }

    // Final Save
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(existingData, null, 2));
    await browser.close();
    console.log("Bulk Scraping Complete.");
}

run();
