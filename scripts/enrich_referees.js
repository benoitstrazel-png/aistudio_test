import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

puppeteer.use(StealthPlugin());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const J16_FILE = path.join(__dirname, '../src/data/matches_j16_scraped.json');
const HISTORY_FILE = path.join(__dirname, '../src/data/matches_history_detailed.json');
const LINEUPS_FILE = path.join(__dirname, '../src/data/lineups_2025_2026.json');

async function scrapeReferee(page, url) {
    if (!url) return 'N/A';
    try {
        // Extract MID from URL
        const urlObj = new URL(url);
        let mid = urlObj.searchParams.get('mid');
        if (!mid) {
            const parts = urlObj.pathname.split('/');
            const matchIdx = parts.indexOf('match');
            if (matchIdx !== -1 && parts[matchIdx + 1]) {
                mid = parts[matchIdx + 1];
            }
        }

        if (!mid) {
            console.error(`Could not extract MID from ${url}`);
            return 'N/A';
        }

        const targetUrl = `https://www.flashscore.fr/match/${mid}/`;
        console.log(`Scraping referee for: ${targetUrl}`);

        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait for Match Info section
        try {
            await page.waitForSelector('.wcl-row_642-O, .mi__item', { timeout: 5000 });
        } catch (e) { }

        const referee = await page.evaluate(() => {
            // 1. Search for items by class (stable if they exist)
            const refereeItem = Array.from(document.querySelectorAll('.mi__item, .wcl-row_642-O'))
                .find(item => item.textContent.toUpperCase().includes('ARBITRE'));

            if (refereeItem) {
                // Try to find the specific content bucket
                const content = refereeItem.querySelector('.mi__content, .wcl-infoValue_grawU, .wcl-bold_NZXv6');
                if (content && content.innerText.trim() && content.innerText.trim().toUpperCase() !== 'ARBITRE') {
                    return content.innerText.trim();
                }

                // Fallback: search within the item's text, removing the label
                let text = refereeItem.innerText.replace(/ARBITRE:?/i, '').trim();
                if (text) return text;
            }

            // 2. Search by label text directly
            const allSpans = Array.from(document.querySelectorAll('span, div'));
            const label = allSpans.find(el => el.innerText.trim().toUpperCase() === 'ARBITRE:');
            if (label) {
                // Return sibling or parent's second child
                const next = label.nextElementSibling;
                if (next) return next.innerText.trim();
                const parentNext = label.parentElement.children[1];
                if (parentNext) return parentNext.innerText.trim();
            }

            return 'N/A';
        });

        console.log(`Found: ${referee}`);
        return referee;
    } catch (e) {
        console.error(`Error scraping ${url}: ${e.message}`);
        return 'N/A';
    }
}

async function run() {
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // 1. Process J16
    if (fs.existsSync(J16_FILE)) {
        console.log('\n--- Processing J16 matches ---');
        const j16Matches = JSON.parse(fs.readFileSync(J16_FILE, 'utf8'));
        for (const match of j16Matches) {
            if (!match.referee || match.referee === 'N/A') {
                match.referee = await scrapeReferee(page, match.url);
            }
        }
        fs.writeFileSync(J16_FILE, JSON.stringify(j16Matches, null, 4));
    }

    // 2. Process History detailed
    if (fs.existsSync(HISTORY_FILE)) {
        console.log('\n--- Processing Detailed History matches ---');
        const historyMatches = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
        // Limit to prevent giant runs if not needed, but here we do all missing
        for (const match of historyMatches) {
            if (!match.referee || match.referee === 'N/A') {
                match.referee = await scrapeReferee(page, match.url);
            }
        }
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(historyMatches, null, 2));
    }

    // 3. Process Lineups (often redundant with history but good to have)
    if (fs.existsSync(LINEUPS_FILE)) {
        console.log('\n--- Processing Lineups matches ---');
        const lineupsMatches = JSON.parse(fs.readFileSync(LINEUPS_FILE, 'utf8'));
        for (const match of lineupsMatches) {
            if (!match.referee || match.referee === 'N/A') {
                match.referee = await scrapeReferee(page, match.url);
            }
        }
        fs.writeFileSync(LINEUPS_FILE, JSON.stringify(lineupsMatches, null, 2));
    }

    await browser.close();
    console.log('\nEnrichment complete!');
}

run();
