const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.goto('https://www.flashscore.fr/match/football/lorient-jgNAYRGi/lyon-2akflumR/resume/stats/?mid=Qc01MMcM', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 6000));
    const text = await page.evaluate(() => {
        const row = document.querySelector('[data-testid="wcl-statistics"]');
        return row ? JSON.stringify(row.innerText) : "NOT FOUND";
    });
    console.log("ROW INNER TEXT:", text);
    await browser.close();
}
run();
