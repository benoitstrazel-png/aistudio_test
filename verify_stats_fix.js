import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const delay = (min, max) => {
    if (typeof max === 'undefined') max = min;
    return new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1) + min)));
};

const clickStatsTab = async (page) => {
    try {
        console.log("  [Navigation] Checking for Stats tab...");

        const alreadyOnStats = await page.evaluate(() => {
            const text = document.body.innerText;
            return text.includes('Possession') || text.includes('Ballbesitz') || text.includes('Tirs');
        });

        if (alreadyOnStats) {
            console.log("  [Navigation] Stats already visible. Skipping click.");
            return;
        }

        const clicked = await page.evaluate(() => {
            const tabs = Array.from(document.querySelectorAll('button[role="tab"]'));
            const statTab = tabs.find(t => {
                const txt = t.innerText ? t.innerText.trim().toUpperCase() : '';
                return txt === 'STATS' || txt === 'STATISTIQUES';
            });
            if (statTab) {
                statTab.click();
                return true;
            }

            const links = Array.from(document.querySelectorAll('a[href*="/statistiques"]'));
            if (links.length > 0) {
                links[0].click();
                return true;
            }

            return false;
        });

        if (clicked) {
            console.log("  [Navigation] Clicked Stats tab via DOM.");
            await delay(1000, 2000);
        } else {
            console.log("  [Navigation] Stats tab not found.");
        }
    } catch (e) {
        console.error("  [Navigation] Error clicking stats tab:", e.message);
    }
};

async function scrapeStatsPage(page, url) {
    if (!url) return {};

    try {
        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await delay(3000, 5000);

        await page.evaluate(() => {
            const sensitiveIds = ['onetrust-banner-sdk', 'onetrust-consent-sdk', 'qc-cmp2-container', 'didomi-host'];
            sensitiveIds.forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
        });
        await delay(500, 1000);

        await clickStatsTab(page);

        try {
            console.log("  [Navigation] Waiting for 'Possession' text...");
            await page.waitForFunction(() => {
                const bodyText = document.body.innerText || "";
                return bodyText.includes('Possession') || bodyText.includes('Ballbesitz') || bodyText.includes('Possesso');
            }, { timeout: 5000 });
            console.log(`  [Navigation] Stats text found!`);
        } catch (e) {
            console.log("  [Navigation] Timeout waiting for 'Possession' text.");
        }

        await delay(1000, 1500);

        const { stats, logs } = await page.evaluate(() => {
            const logs = [];
            const stats = {};
            const rows = Array.from(document.querySelectorAll('div[class*="stat__row"], div[class*="wcl-row_"]'));

            rows.forEach(row => {
                const labelEl = row.querySelector('[class*="categoryName"], [class*="category"]');
                const homeEl = row.querySelector('[class*="homeValue"], [class*="home"]');
                const awayEl = row.querySelector('[class*="awayValue"], [class*="away"]');
                if (labelEl && homeEl && awayEl) {
                    stats[labelEl.innerText.trim()] = { home: homeEl.innerText.trim(), away: awayEl.innerText.trim() };
                }
            });
            return { stats, logs };
        });

        return { stats, logs };

    } catch (error) {
        console.error(`Error scraping ${url}: ${error.message}`);
        return {};
    }
}

async function run() {
    console.log("Starting Verification Scraper...");
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    const testUrl = 'https://www.flashscore.fr/match/8fqoPIEd/#/statistiques-du-match/0';
    console.log(`Testing on ${testUrl}`);

    const result = await scrapeStatsPage(page, testUrl);
    console.log("Result Stats Keys:", Object.keys(result.stats || {}));
    if (Object.keys(result.stats || {}).length > 0) {
        console.log("SUCCESS: Stats extracted.");
    } else {
        console.error("FAILURE: No stats found.");
    }

    await browser.close();
}

run();
