const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '../src/data/player_positions_tm.json');

const players = [
    { name: "Abdelli H.", search: "Himad Abdelli" },
    { name: "Rabiot A.", search: "Adrien Rabiot" },
    { name: "Achraf Hakimi", search: "Achraf Hakimi" },
    { name: "Quentin Merlin", search: "Quentin Merlin" }
];

async function run() {
    const existingData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    for (const p of players) {
        console.log(`Searching for ${p.search}...`);
        const query = `site:transfermarkt.fr ${p.search}`;
        await page.goto(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&kl=fr-fr`);
        await new Promise(r => setTimeout(r, 2000));

        const linkSelector = 'article h2 a, .result__a';
        const firstLink = await page.$(linkSelector);

        if (firstLink) {
            await firstLink.click();
            await new Promise(r => setTimeout(r, 3000));

            const data = await page.evaluate(() => {
                const res = { main: null, other: [], age: null, image: null };

                // Image
                const img = document.querySelector('.data-header__profile-container img');
                if (img) res.image = img.src;

                // Age/Position
                const labels = Array.from(document.querySelectorAll('.info-table__content--regular'));
                labels.forEach(el => {
                    const text = el.textContent.trim();
                    if (text.includes('Âge:') || text.includes('Age:')) res.age = el.nextElementSibling?.textContent.trim();
                    if (text.includes('Date de naissance:')) {
                        const val = el.nextElementSibling?.textContent.trim();
                        const ageMatch = val?.match(/\((\d+)\)/);
                        if (ageMatch) res.age = ageMatch[1];
                    }
                    if (text.includes('Position:')) res.main = el.nextElementSibling?.textContent.trim();
                });
                return res;
            });

            if (data.main || data.image) {
                console.log(`Found:`, data);
                existingData[p.name] = { ...existingData[p.name], ...data };
            }
        }
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(existingData, null, 2));
    await browser.close();
}

run();
