import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

async function debugMarseille() {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    try {
        console.log('Navigating to Marseille squad page...');
        await page.goto('https://ligue1.com/fr/club-sheet/olympique_de_marseille/squad', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        // Accept cookies
        try {
            const acceptBtn = await page.waitForSelector('#didomi-notice-agree-button', { timeout: 5000 });
            if (acceptBtn) await acceptBtn.click();
        } catch (e) { }

        // Extract __NEXT_DATA__
        const nextData = await page.evaluate(() => {
            const scriptEl = document.getElementById('__NEXT_DATA__');
            if (!scriptEl) return { error: '__NEXT_DATA__ not found' };

            try {
                return JSON.parse(scriptEl.textContent);
            } catch (e) {
                return { error: 'Failed to parse', message: e.message };
            }
        });

        console.log('Saving __NEXT_DATA__ structure to debug_marseille_nextdata.json...');
        fs.writeFileSync('debug_marseille_nextdata.json', JSON.stringify(nextData, null, 2));
        console.log('Done! Check debug_marseille_nextdata.json for the structure.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

debugMarseille();
