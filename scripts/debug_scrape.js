import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    const url = "https://www.flashscore.fr/match/football/psg-CjhkPw0k/rennes-d2nnj1IE/?mid=h8ptFvjd";
    console.log(`Debugging URL: ${url}`);

    console.log('--- Environment Check ---');
    console.log('PUPPETEER_EXECUTABLE_PATH:', process.env.PUPPETEER_EXECUTABLE_PATH);

    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || null;
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
    try {
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'media', 'font', 'stylesheet'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        const html = await page.content();
        fs.writeFileSync(path.join(__dirname, '../debug_page.html'), html);
        console.log("HTML dumped to debug_page.html");

    } catch (err) {
        console.error("Error in debug_scrape:", err);
    } finally {
        await browser.close();
    }
}

run();
