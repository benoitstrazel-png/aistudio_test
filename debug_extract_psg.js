import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const TARGET_URL = 'https://www.flashscore.fr/match/4zdpXry1/#/resume/compositions/';

async function debugExtract() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--window-size=1920,1080']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('Navigating to:', TARGET_URL);
    await page.goto(TARGET_URL, { waitUntil: 'networkidle2' });

    // Accept cookies
    try {
        const acceptBtn = await page.$('#onetrust-accept-btn-handler');
        if (acceptBtn) await acceptBtn.click();
    } catch (e) { }

    await new Promise(r => setTimeout(r, 5000));

    const textContent = await page.evaluate(() => document.body.innerText);
    fs.writeFileSync('debug_psg_text.txt', textContent);

    console.log('Dumped text.');
    await browser.close();
}

debugExtract();
