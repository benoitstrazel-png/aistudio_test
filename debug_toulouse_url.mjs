import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.goto('https://ligue1.com/fr/competitions/ligue1mcdonalds/standings', { waitUntil: 'networkidle2' });

const squadUrls = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href*="/club-sheet/"]'));
    const links = anchors
        .map(a => a.href.split(/[?#]/)[0])
        .filter(href => !href.includes('/squad') && !href.includes('/stats'));

    return [...new Set(links)].map(url => {
        let base = url;
        if (base.endsWith('/')) base = base.slice(0, -1);
        if (base.endsWith('/info')) base = base.replace('/info', '');
        return `${base}/squad`;
    });
});

console.log('All club URLs:');
squadUrls.forEach((url, i) => console.log(`${i + 1}. ${url}`));

console.log('\n\nToulouse-related URLs:');
const toulouseUrls = squadUrls.filter(u => u.toLowerCase().includes('tou'));
toulouseUrls.forEach(url => console.log(url));

await browser.close();
