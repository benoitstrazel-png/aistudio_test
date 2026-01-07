
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

puppeteer.use(StealthPlugin());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MISSING_CLUBS = [
    { name: 'Stade de Reims', url: 'https://ligue1.com/fr/club-sheet/l1_championship_club_2025_41/squad' },
    { name: 'As Saint-Étienne', url: 'https://ligue1.com/fr/club-sheet/l1_championship_club_2025_13/squad' }
];

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            let distance = 100;
            let timer = setInterval(() => {
                let scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= scrollHeight || totalHeight > 10000) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

async function scrapeMissing() {
    const browser = await puppeteer.launch({
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    });
    const dataPath = path.join(__dirname, '../src/data/player_photos.json');
    let data = {};
    if (fs.existsSync(dataPath)) {
        data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    }

    for (const club of MISSING_CLUBS) {
        console.log(`Scraping ${club.name}...`);
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        try {
            await page.goto(club.url, { waitUntil: 'networkidle2', timeout: 60000 });
            await autoScroll(page);
            await new Promise(r => setTimeout(r, 2000));

            const players = await page.evaluate(() => {
                const results = [];
                const cards = document.querySelectorAll('a[href*="/player-sheet/"]');
                cards.forEach(card => {
                    const nameEl = card.querySelector('h5');
                    const imgEl = card.querySelector('img[src*="player_official"]');
                    if (nameEl && imgEl) {
                        results.push({
                            name: nameEl.innerText.trim(),
                            photo: imgEl.src
                        });
                    }
                });
                return results;
            });

            if (players.length > 0) {
                data[club.name] = players;
                console.log(`-> Scraped ${players.length} players for ${club.name}`);
            } else {
                console.log(`-> FAILED to find players for ${club.name}`);
            }
        } catch (err) {
            console.error(`Error scraping ${club.name}: ${err.message}`);
        } finally {
            await page.close();
        }
    }

    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    console.log('Updated player_photos.json');
    await browser.close();
}

scrapeMissing();
