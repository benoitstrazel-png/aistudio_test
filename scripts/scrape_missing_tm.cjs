const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const STATS_FILE = path.join(__dirname, '../src/data/player_stats_calculated.json');
const OUTPUT_FILE = path.join(__dirname, '../src/data/player_positions_tm.json');

// Helper delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const randomDelay = (min = 2000, max = 5000) => delay(Math.floor(Math.random() * (max - min + 1) + min));

async function run() {
    console.log("Starting Missing Player Positions Scraper...");

    // 1. Load Data
    if (!fs.existsSync(STATS_FILE)) {
        console.error("FATAL: player_stats_calculated.json not found.");
        process.exit(1);
    }
    const statsData = JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));

    // Flatten stats player list
    let statsPlayers = [];
    for (const [team, roster] of Object.entries(statsData)) {
        roster.forEach(p => {
            statsPlayers.push({ name: p.name, team: p.team });
        });
    }

    let existingData = {};
    if (fs.existsSync(OUTPUT_FILE)) {
        existingData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
    }

    // 2. Identify Missing
    const norm = (str) => str?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\./g, "").trim() || "";

    // Check match function (reusing logic from frontend)
    const findMatch = (name) => {
        const n = norm(name);
        for (const [key, val] of Object.entries(existingData)) {
            if (norm(key) === n) return true;
        }
        // Fuzzy
        const parts = n.split(' ').filter(x => x.length > 1);
        if (parts.length > 0) {
            for (const [key, val] of Object.entries(existingData)) {
                const kNorm = norm(key);
                // "Greenwood M." vs "Mason Greenwood"
                // "Greenwood" (last) must be in "Mason Greenwood"
                // "M" (first int) must match start of "Mason"
                // Or "Greenwood" (first in M. Greenwood) ? No format is Last F.

                // name is "Greenwood M." -> parts: ["greenwood"] (m is len 1, filtered out? No, let's keep len 1 for initials)
            }
        }
        return false;
    };

    // We used a simpler check: is the KEY exactly present? 
    // Actually the Frontend fuzzy matching logic does the heavy lifting. 
    // We just want to ensure we have an entry that *could* match.
    // If "Greenwood M." is missing from keys, we should try to find a "Greenwood" entry. 
    // But to be safe, let's just scrape anyone whose exact name isn't a key, 
    // AND who doesn't have a very obvious match.

    // AND who don't match the fuzzy logic (roughly).

    // 2. Load Missing Report
    const MISSING_REPORT_FILE = path.join(__dirname, '../missing_positions.json');
    if (!fs.existsSync(MISSING_REPORT_FILE)) {
        console.error("Missing report not found. Run check_positions_coverage.cjs first.");
        return;
    }
    const report = JSON.parse(fs.readFileSync(MISSING_REPORT_FILE, 'utf-8'));

    // Combine missing and errors
    // We prioritize errors to retry them with better logic
    const toProcessFull = [...report.errors, ...report.missing];

    // 3. Load Real Players for Name Mapping (Abbrev -> Full)
    const REAL_PLAYERS_FILE = path.join(__dirname, '../src/data/real_players.json');
    let realPlayersMap = {};
    if (fs.existsSync(REAL_PLAYERS_FILE)) {
        const rpData = JSON.parse(fs.readFileSync(REAL_PLAYERS_FILE, 'utf-8'));
        Object.values(rpData).forEach(roster => {
            roster.forEach(p => {
                const parts = p.name.split(' ');
                const last = parts[parts.length - 1];
                realPlayersMap[last.toLowerCase()] = p.name;
            });
        });
    }

    console.log(`Found ${toProcessFull.length} players to process from coverage report.`);

    // Limit for safety (batch of 100)
    const toProcess = toProcessFull.slice(0, 100);
    console.log(`Processing top ${toProcess.length}...`);

    // 4. Launch Browser
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    for (const p of toProcess) {
        console.log(`Processing: ${p.name} (${p.team || 'Unknown'})...`);

        let cleanName = p.name;

        // Strategy: Try to find Full Name
        // 1. Direct Lookup in our constructed map
        const parts = p.name.split(' ');
        const last = parts[0].toLowerCase(); // "Chevalier" from "Chevalier L." 
        // Note: standard format is "Chevalier L." so last name is first part usually in abbrev

        if (realPlayersMap[last]) {
            cleanName = realPlayersMap[last];
            console.log(`   > Inferred Full Name: "${cleanName}"`);
        } else {
            // Fallback: "Chevalier L." -> "Chevalier"
            cleanName = p.name.replace(/\s+[A-Z]\.$/, '').replace(/\s+[A-Z]$/, '');
            console.log(`   > Using Cleaned Name: "${cleanName}"`);
        }

        console.log(`Processing matching for: ${p.name} -> Search: "${cleanName}"...`);

        // No check for existingData here because we want to overwrite errors

        try {
            // RETRY STRATEGY: Search without Initial
            const query = `site:transfermarkt.fr ${cleanName}`;
            const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&kl=fr-fr`;

            try {
                await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                await randomDelay(1000, 2000);
            } catch (navErr) {
                console.warn(`Warning: Navigation error for ${p.name}: ${navErr.message}. Reloading page and skipping...`);
                // Try to recover the page/tab
                try { await page.reload(); } catch (e) { }
                continue;
            }

            const linkSelector = 'article h2 a, .react-results--main li h2 a, .result__a';
            let firstLink = await page.$(linkSelector);

            if (firstLink) {
                await firstLink.click();
                try {
                    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 });
                } catch (e) { console.log('Nav timeout/redirect'); }

                await randomDelay(1000, 2000);

                // Check if we are on a player page (look for header)
                const isPlayerPage = await page.$('.data-header__headline-wrapper');
                if (isPlayerPage) {
                    // Extract Data
                    const data = await page.evaluate(() => {
                        const result = { main: null, other: [], age: null, image: null };

                        // Age/Birth
                        const infoLabels = Array.from(document.querySelectorAll('.info-table__content--regular'));
                        infoLabels.forEach(el => {
                            const text = el.textContent.trim();
                            if (text.includes('Âge:') || text.includes('Age:')) {
                                result.age = el.nextElementSibling?.textContent.trim();
                            }
                            if (text.includes('Date de naissance:')) {
                                // Often contains age in brackets: "24 janv. 1996 (28)"
                                const val = el.nextElementSibling?.textContent.trim();
                                const ageMatch = val?.match(/\((\d+)\)/);
                                if (ageMatch) result.age = ageMatch[1];
                            }
                        });

                        // Image
                        const img = document.querySelector('.data-header__profile-container img');
                        if (img && img.src && !img.src.includes('placeholder')) {
                            result.image = img.src;
                        }

                        const labels = Array.from(document.querySelectorAll('.info-table__content--regular'));
                        labels.forEach((el) => {
                            const text = el.textContent.trim();
                            if (text.includes('Position') && !text.includes('Autre')) {
                                const val = el.nextElementSibling?.textContent.trim();
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
                        if (!result.main) {
                            const mainBox = document.querySelector('.detail-position__position');
                            if (mainBox) result.main = mainBox.textContent.trim();
                        }
                        return result;
                    });

                    if (data.main) {
                        console.log(`   > Found: ${data.main}`);
                        // Store using the stats name as key to ensure direct match next time!
                        // This fixes the fuzzy match issue by providing an EXACT match key.
                        existingData[p.name] = data;
                    } else {
                        console.warn(`   > Failed to extract position`);
                        existingData[p.name] = { error: "Extraction failed" };
                    }
                } else {
                    console.warn("   > Not a player page?");
                    existingData[p.name] = { error: "Not a player page" };
                }

            } else {
                console.warn("   > No search results found.");
                existingData[p.name] = { error: "No Search Result" };
            }

            // Save
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(existingData, null, 2));

        } catch (e) {
            console.error("Error:", e.message);
        }
    }

    await browser.close();
    console.log("Done.");
}

run();
