import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

puppeteer.use(StealthPlugin());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_FILE = path.join(__dirname, 'src/data/player_photos.json');

const TOULOUSE_URL = 'https://ligue1.com/fr/club-sheet/l1_championship_club_2025_16/squad';

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

    try {
        console.log(`Scraping: ${TOULOUSE_URL}\n`);
        await page.goto(TOULOUSE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Accept cookies if present
        try {
            const acceptBtn = await page.waitForSelector('#didomi-notice-agree-button', { timeout: 5000 });
            if (acceptBtn) await acceptBtn.click();
            console.log('Cookies accepted');
        } catch (e) {
            console.log('No cookie banner');
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

        const clubKey = officialName || 'Toulouse Fc';
        console.log(`Club identified as: ${clubKey}\n`);

        // Auto-scroll to load all player cards
        console.log('Auto-scrolling to load all players...');
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

        console.log(`\nScraped ${players.length} players for ${clubKey}`);
        console.log('Players:', players.map(p => p.name).join(', '));

        if (players.length > 0) {
            clubsData[clubKey] = players;
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(clubsData, null, 2));
            console.log(`\n✅ Successfully saved ${players.length} Toulouse players to player_photos.json`);
        } else {
            console.log('\n❌ No players found');
        }

    } catch (err) {
        console.error(`Error: ${err.message}`);
    } finally {
        await browser.close();
    }
}

scrapeToulouse();
