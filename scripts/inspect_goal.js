
import puppeteer from 'puppeteer';

async function run() {
    const url = "https://www.flashscore.fr/match/football/psg-CjhkPw0k/rennes-d2nnj1IE/?mid=h8ptFvjd";
    console.log(`Inspecting URL: ${url}`);

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Auto-scroll
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 150;
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

    // Wait a bit
    await new Promise(r => setTimeout(r, 2000));

    // Inspect
    const info = await page.evaluate(() => {
        // Find row with Jacquet
        const rows = Array.from(document.querySelectorAll('.smv__participantRow'));
        const targetRow = rows.find(r => r.innerText.includes('Jacquet'));

        if (!targetRow) return { error: "Jacquet row not found" };

        const iconContainer = targetRow.querySelector('.smv__incidentIcon');
        const svg = iconContainer ? iconContainer.querySelector('svg') : null;

        return {
            rowHtml: targetRow.outerHTML.slice(0, 500),
            iconContainerHtml: iconContainer ? iconContainer.outerHTML : "No icon container",
            svgClass: svg ? svg.getAttribute('class') : "No SVG or no class",
            allClassesInRow: Array.from(targetRow.classList).join(' '),
            allText: targetRow.innerText
        };
    });

    console.log("Inspection Results:", JSON.stringify(info, null, 2));

    await browser.close();
}

run();
