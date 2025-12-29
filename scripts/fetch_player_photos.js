
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

// Clubs to EXCLUDE (not in Ligue 1 2025-2026)
const EXCLUDED_CLUBS = ['saint-etienne', 'reims'];

async function fetchPlayerPhotos() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        console.log(`[1/3] Fetching Club URLs from ${STANDINGS_URL}...`);
        await page.goto(STANDINGS_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        // Accept Cookies
        try {
            const acceptBtn = await page.waitForSelector('#didomi-notice-agree-button', { timeout: 5000 });
            if (acceptBtn) await acceptBtn.click();
            console.log('   -> Cookies accepted.');
        } catch (e) {
            console.log('   -> No cookie banner.');
        }

        // Extract Squad URLs
        const squadUrls = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a[href*="/club-sheet/"]'));
            const links = anchors
                .map(a => a.href.split(/[?#]/)[0])
                .filter(href => !href.includes('/squad') && !href.includes('/stats'));

            const uniqueSquadUrls = [...new Set(links)].map(url => {
                let base = url;
                if (base.endsWith('/')) base = base.slice(0, -1);
                if (base.endsWith('/info')) base = base.replace('/info', '');
                return `${base}/squad`;
            });

            return uniqueSquadUrls;
        });

        console.log(`   -> Found ${squadUrls.length} clubs.`);

        console.log(`   -> Found ${squadUrls.length} clubs.`);

        // LOAD EXISTING DATA to avoid wiping
        let clubsData = {};
        if (fs.existsSync(OUTPUT_FILE)) {
            clubsData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
            console.log(`   -> Loaded existing data for ${Object.keys(clubsData).length} clubs.`);
        }

        for (let i = 0; i < squadUrls.length; i++) {
            const squadUrl = squadUrls[i];
            const clubSlug = squadUrl.split('/').slice(-2)[0];

            // TARGET ONLY TOULOUSE (User Request)
            if (!clubSlug.toLowerCase().includes('toulouse')) {
                continue;
            }

            console.log(`[2/3] Processing ${i + 1}/${squadUrls.length}: ${squadUrl}`);

            try {
                await page.goto(squadUrl, { waitUntil: 'networkidle2', timeout: 60000 });
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Extract club name from H1
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

                // Force distinct key if needed, or stick to official
                const clubKey = officialName || clubSlug.replace(/_/g, ' ');
                console.log(`   -> Identified as: ${clubKey}`);

                await autoScroll(page);

                // Extract players (ORIGINAL DOM METHOD)
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
                clubsData[clubKey] = players; // Update or Add Toulouse

            } catch (err) {
                console.error(`   -> Failed: ${err.message}`);
            }
        }

        console.log(`[3/3] Saving to ${OUTPUT_FILE}...`);
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(clubsData, null, 2));
        console.log('✅ Done.');

    } catch (error) {
        console.error('Fatal Error:', error);
    } finally {
        await browser.close();
    }
}

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 400;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight || totalHeight > 8000) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

fetchPlayerPhotos();
