import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

async function debugPlayerCard() {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    try {
        console.log('Navigating to Marseille squad page...');
        await page.goto('https://ligue1.com/fr/club-sheet/olympique_de_marseille/squad', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // Accept cookies
        try {
            const acceptBtn = await page.waitForSelector('#didomi-notice-agree-button', { timeout: 5000 });
            if (acceptBtn) await acceptBtn.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (e) { }

        // Wait for player cards to load
        await page.waitForSelector('a[href*="/player-sheet/"]', { timeout: 10000 });

        // Extract first 3 player card HTML for inspection
        const cardsHTML = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('a[href*="/player-sheet/"]')).slice(0, 3);
            return cards.map(c => ({
                outerHTML: c.outerHTML,
                href: c.href,
                ariaLabel: c.getAttribute('aria-label'),
                title: c.getAttribute('title'),
                innerText: c.innerText
            }));
        });

        console.log('Saving player card samples to debug_player_cards.json...');
        fs.writeFileSync('debug_player_cards.json', JSON.stringify(cardsHTML, null, 2));
        console.log('Done! Check debug_player_cards.json');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

debugPlayerCard();
