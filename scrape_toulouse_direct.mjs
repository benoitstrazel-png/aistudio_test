import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

puppeteer.use(StealthPlugin());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_FILE = path.join(__dirname, '../src/data/player_photos.json');

// Try different potential URL patterns for Toulouse
const TOULOUSE_URLS = [
    'https://ligue1.com/fr/club-sheet/toulouse-football-club_2025_8/squad',
    'https://ligue1.com/fr/club-sheet/toulouse-fc_2025_8/squad',
    'https://ligue1.com/fr/club-sheet/tfc_2025_8/squad',
    'https://ligue1.com/fr/club-sheet/toulouse_2025_8/squad'
];

async function scrapeToulouse() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox']
    });
    const page = await browser.newPage();

    // Load existing data
    let clubsData = {};
    if (fs.existsSync(OUTPUT_FILE)) {
        clubsData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
        console.log(`Loaded existing data for ${Object.keys(clubsData).length} clubs.`);
    }

    for (const url of TOULOUSE_URLS) {
        console.log(`\nTrying: ${url}`);
        try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

            // Check if page loaded successfully
            const title = await page.title();
            if (title.toLowerCase().includes('404') || title.toLowerCase().includes('not found')) {
                console.log(`  -> 404 Not Found`);
                continue;
            }

            // Extract club name
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

            if (!officialName) {
                console.log(`  -> Could not extract club name`);
                continue;
            }

            console.log(`  -> Found: ${officialName}`);

            // Auto-scroll
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

            // Extract players
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

            console.log(`  -> Scraped ${players.length} players`);

            if (players.length > 0) {
                clubsData[officialName] = players;
                fs.writeFileSync(OUTPUT_FILE, JSON.stringify(clubsData, null, 2));
                console.log(`\n✅ Successfully saved Toulouse data as "${officialName}"`);
                await browser.close();
                return;
            }

        } catch (err) {
            console.log(`  -> Error: ${err.message}`);
        }
    }

    console.log('\n❌ Could not find Toulouse squad page');
    await browser.close();
}

scrapeToulouse();
