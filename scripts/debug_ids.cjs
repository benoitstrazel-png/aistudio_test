const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
    console.log('--- Environment Check ---');
    console.log('PUPPETEER_EXECUTABLE_PATH:', process.env.PUPPETEER_EXECUTABLE_PATH);

    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || null;
    console.log(`Using executablePath: ${executablePath || 'bundled'}`);
    const browser = await puppeteer.launch({
        executablePath: executablePath || undefined,
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote',
            '--single-process'
        ]
    });
    const page = await browser.newPage();
    await page.goto('https://www.flashscore.fr/match/football/lorient-jgNAYRGi/lyon-2akflumR/resume/stats/?mid=Qc01MMcM', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 5000));
    const testIds = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('*'))
            .filter(el => el.getAttribute('data-testid'))
            .map(el => el.getAttribute('data-testid'));
    });
    console.log("TEST IDS:", [...new Set(testIds)]);
    await browser.close();
}
run();
