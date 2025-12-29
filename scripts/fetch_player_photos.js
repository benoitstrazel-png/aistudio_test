
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

puppeteer.use(StealthPlugin());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_FILE = path.join(__dirname, '../src/data/player_photos.json');
const STANDINGS_URL = 'https://ligue1.com/fr/competitions/ligue1mcdonalds/standings';

async function fetchPlayerPhotos() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        console.log(`[1/3] Fetching Club URLs from ${STANDINGS_URL}...`);
        await page.goto(STANDINGS_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        // Accept Cookies if present
        try {
            const acceptBtn = await page.waitForSelector('#didomi-notice-agree-button', { timeout: 5000 });
            if (acceptBtn) await acceptBtn.click();
            console.log('   -> Cookies accepted.');
        } catch (e) {
            console.log('   -> No cookie banner found (or already accepted).');
        }

        // Extract Club Squad URLs
        const squadUrls = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a[href*="/club-sheet/"]'));
            const links = anchors
                .map(a => a.href.split(/[?#]/)[0]) // Strip query/hash
                .filter(href => !href.includes('/squad') && !href.includes('/stats')); // Get base links

            // Convert base links to squad links and dedupe
            const uniqueSquadUrls = [...new Set(links)].map(url => {
                let base = url;
                if (base.endsWith('/')) base = base.slice(0, -1);
                if (base.endsWith('/info')) base = base.replace('/info', '');
                return `${base}/squad`;
            });

            return uniqueSquadUrls;
        });

        console.log(`   -> Found ${squadUrls.length} clubs.`);

        const clubsData = {};

        // Process each club
        for (let i = 0; i < squadUrls.length; i++) {
            const squadUrl = squadUrls[i];
            console.log(`[2/3] Processing Club ${i + 1}/${squadUrls.length}: ${squadUrl}`);

            try {
                // Navigate to squad page
                await page.goto(squadUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

                // Extract Official Club Name from H1 or NEXT_DATA
                const officialName = await page.evaluate(() => {
                    const h1 = document.querySelector('h1');
                    if (h1 && h1.innerText.trim().length > 3) return h1.innerText.trim();

                    try {
                        const nextData = JSON.parse(document.getElementById('__NEXT_DATA__').textContent);
                        return nextData.props.pageProps.club.clubName;
                    } catch (e) {
                        return null;
                    }
                });

                const clubKey = officialName || squadUrl.split('/').slice(-2)[0].replace(/_/g, ' ');
                console.log(`   -> Identified as: ${clubKey}`);

                // Scroll to load images
                await autoScroll(page);

                // Extract Players
                const players = await page.evaluate(() => {
                    const cards = Array.from(document.querySelectorAll('a[href*="/player-sheet/"]'));
                    return cards.map(c => {
                        const nameEls = Array.from(c.querySelectorAll('h5'));
                        const fullName = nameEls.map(el => el.innerText.trim()).join(' ');

                        const img = c.querySelector('img[src*="player_official"]');
                        const photoUrl = img ? img.src : null;

                        return { name: fullName, photo: photoUrl };
                    }).filter(p => p.name && p.photo);
                });

                console.log(`   -> Scraped ${players.length} players for ${clubKey}.`);
                clubsData[clubKey] = players;

            } catch (err) {
                console.error(`   -> Failed to scrape ${squadUrl}: ${err.message}`);
            }
        }

        // Save
        console.log(`[3/3] Saving data to ${OUTPUT_FILE}...`);
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(clubsData, null, 2));
        console.log('Done.');

    } catch (error) {
        console.error('Fatal Error:', error);
    } finally {
        await browser.close();
    }
}

// Helper: Auto Scroll
async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 400;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                // Stop scrolling if we've reached the bottom OR if we've scrolled enough
                if (totalHeight >= scrollHeight || totalHeight > 8000) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

fetchPlayerPhotos();
