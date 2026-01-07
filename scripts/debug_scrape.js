
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    const url = "https://www.flashscore.fr/match/football/psg-CjhkPw0k/rennes-d2nnj1IE/?mid=h8ptFvjd"; // PSG 5-0 Rennes
    console.log(`Debugging URL: ${url}`);

    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || null;
    console.log(`Using executablePath: ${executablePath || 'bundled'}`);
    const browser = await puppeteer.launch({
        executablePath: executablePath || undefined,
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Scroll
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= 2000) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });

    await new Promise(r => setTimeout(r, 2000));

    const html = await page.content();
    fs.writeFileSync(path.join(__dirname, '../debug_page.html'), html);
    console.log("HTML dumped to debug_page.html");

    await browser.close();
}

run();
