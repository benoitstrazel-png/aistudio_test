
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const URLS_FILE = path.join(__dirname, '../src/data/matches_urls_2025_2026.json');
const OUTPUT_FILE = path.join(__dirname, '../src/data/lineups_j1_j15.json');

async function scrapeLineups(browser, url, roundInfo) {
    const page = await browser.newPage();
    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');

        // Construct Lineups URL (usually match URL + /resume/compositions/ or simply append /compositions)
        // Flashscore URLs often look like .../match-id/ -> .../match-id/compositions
        // Let's try appending /compositions if it's not already there? 
        // Actually, clicking the tab is safer, OR navigating directly if we know the pattern.
        // Let's deduce the pattern: match_url usually ends with query params like ?mid=...
        // e.g. https://www.flashscore.fr/match/football/lorient-jgNAYRGi/lyon-2akflumR/?mid=Qc01MMcM
        // We want: https://www.flashscore.fr/match/football/lorient-jgNAYRGi/lyon-2akflumR/compositions

        // Use Hash URL for Composition
        // URL is like .../match/... match params usually ignored if we have hash?
        // Actually, flashscore usually redirects to /match/id/#/resume/compositions
        // Let's try appending /#/resume/compositions
        const baseUrl = url.split('?')[0];
        const lineupsUrl = `${baseUrl}/#/resume/compositions`;

        console.log(`Navigating to ${lineupsUrl}...`);
        await page.goto(lineupsUrl, { waitUntil: 'networkidle2', timeout: 45000 });

        // Wait for key elements
        try {
            await page.waitForSelector('.wcl-lineupSection_s8cM-', { timeout: 10000 });
        } catch (e) {
            console.log(`Warning: Lineups section not found for ${url}`);
        }

        const data = await page.evaluate(() => {
            const clean = (txt) => txt ? txt.trim() : '';
            const containsClass = (el, str) => el.className && typeof el.className === 'string' && el.className.includes(str);

            // 1. Formations
            // Look for generic pattern in header
            const bodyText = document.body.innerText;
            const formationRegex = /(\d\s*-\s*\d(\s*-\s*\d)?(\s*-\s*\d)?)/g;
            // This is too broad, might catch score. 
            // Stick to header selectors or specific layout

            let homeFormation = 'N/A';
            let awayFormation = 'N/A';

            // Try to find elements that look like formation
            // Select all spans/divs with short text matching pattern
            const potentialFormations = Array.from(document.querySelectorAll('span, div'))
                .filter(el => {
                    const txt = el.innerText?.trim();
                    return txt && /^\d\s*-\s*\d\s*-\s*\d/.test(txt) && txt.length < 15;
                });

            if (potentialFormations.length >= 2) {
                homeFormation = potentialFormations[0].innerText.trim();
                awayFormation = potentialFormations[1].innerText.trim();
            }

            // 2. Players
            // Robust generic selector
            let homeStarters = [];
            let awayStarters = [];

            // Find all elements that look like player names
            // wcl-nameWrapper... or wcl-participantName...
            // Let's select all elements with class containing 'nameWrapper' OR 'participantName'
            const wrappers = Array.from(document.querySelectorAll('[class*="nameWrapper"], [class*="participantName"]'));

            // Filter out empty or irrelevant
            // We want those inside the "Starting" section if possible.
            // But if we can't find sections, let's grab all and rely on count.

            // Let's try to find text "(G)" to see where GKs are.
            // wcl-roles...
            const roleEls = Array.from(document.querySelectorAll('[class*="roles"]'));

            // Construct player object from wrapper
            const validPlayers = [];
            wrappers.forEach(wrapper => {
                const name = clean(wrapper.innerText);
                if (!name || name.length < 2) return;

                // Do not duplicate
                // if (validPlayers.find(p => p.name === name)) return; 
                // Wait, subs might have same name? No.

                // Check if GK
                // Check siblings/children/parents for (G)
                // Closest row?
                const row = wrapper.closest('div[class*="row"]') || wrapper.closest('div[style*="display: flex"]');
                // Or just distance in DOM?

                let isGK = false;
                if (row) {
                    if (row.innerText.includes('(G)') || row.innerHTML.includes('(G)')) isGK = true;
                } else {
                    // Check parent
                    if (wrapper.parentNode.innerText.includes('(G)')) isGK = true;
                }

                validPlayers.push({ name, isGK });
            });

            // Assumption: Starting XI are the first 22 valid players found?
            // Usually yes, if we exclude "Suspended" or "Out" lists which come later.
            // Subs come after Starters.

            if (validPlayers.length >= 22) {
                homeStarters = validPlayers.slice(0, 11);
                awayStarters = validPlayers.slice(11, 22);
            }

            return {
                homeFormation,
                awayFormation,
                homeStarters,
                awayStarters
            };
        });

        // Basic Info (Teams) to verify
        const matchInfo = await page.evaluate(() => {
            const home = document.querySelector('.duelParticipant__home .participant__participantName')?.innerText.trim();
            const away = document.querySelector('.duelParticipant__away .participant__participantName')?.innerText.trim();
            return { home, away };
        });

        await page.close();
        return {
            url,
            round: roundInfo,
            teams: matchInfo,
            lineups: data
        };

    } catch (error) {
        console.error(`Error scraping ${url}:`, error.message);
        await page.close();
        return { url, round: roundInfo, error: error.message };
    }
}

async function run() {
    // Read URLs
    const rawData = fs.readFileSync(URLS_FILE, 'utf-8');
    const rounds = JSON.parse(rawData);

    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    });
    const allLineups = [];

    // Count total
    let totalMatches = 0;
    rounds.forEach(r => totalMatches += r.matches.length);
    console.log(`Starting Lineup Scrape for ${totalMatches} matches...`);

    let processedCount = 0;

    for (const round of rounds) {
        console.log(`--- Processing ${round.round} ---`);
        const BATCH_SIZE = 5;

        for (let i = 0; i < round.matches.length; i += BATCH_SIZE) {
            const batch = round.matches.slice(i, i + BATCH_SIZE);
            const promises = batch.map(m => scrapeLineups(browser, m.url, round.round));

            const results = await Promise.all(promises);
            results.forEach(r => allLineups.push(r));

            processedCount += results.length;
            console.log(`Progress: ${processedCount}/${totalMatches}`);

            // Save partially
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allLineups, null, 2));
        }
    }

    await browser.close();
    console.log(`Done. Saved to ${OUTPUT_FILE}`);
}

run();
