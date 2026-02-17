const puppeteer = require('puppeteer');

async function verifyFocusClub() {
    console.log('--- Starting Visual Verification of Focus Club Tab ---');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        // 1. Go to Dashboard
        console.log('Navigating to http://localhost:5173/ ...');
        await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 30000 });

        // 2. Click on "Focus Club" Link
        console.log('Clicking "Focus Club" tab...');
        // Selector based on NavLink logic in App.jsx: href="/club"
        await page.waitForSelector('a[href="/club"]');
        await page.click('a[href="/club"]');

        // 3. Wait for Content to Load
        console.log('Waiting for Club Analysis content...');

        try {
            await page.waitForFunction(
                () => {
                    const text = document.body.innerText.toUpperCase();
                    return text.includes('ANALYSE DÉTAILLÉE') || text.includes('ANALYSE DETAILLEE');
                },
                { timeout: 5000 }
            );
            console.log('✅ Header "ANALYSE DÉTAILLÉE" found.');
        } catch (e) {
            console.error('Wait failed. Checking what IS visible...');
            const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
            console.log('--- Current Body Text (First 500 chars) ---');
            console.log(bodyText);
            console.log('------------------------------------------');

            // Check for specific error overlay from Vite/React
            const errorOverlay = await page.evaluate(() => {
                const overlay = document.querySelector('vite-error-overlay');
                return overlay ? overlay.innerText : null;
            });
            if (errorOverlay) {
                console.error('CRITICAL: Vite Error Overlay detected!');
                console.error(errorOverlay);
            }

            throw new Error("Content did not load in time.");
        }

        // 4. Verify specific Team Loaded (Default PSG)
        const teamHeader = await page.$eval('h2', el => el.innerText);
        console.log(`Team Header found: "${teamHeader}"`);
        if (!teamHeader.includes('PSG')) {
            console.error('❌ Default team should be PSG.');
        }

        // 5. Verify PitchMap
        // Look for canvas or specific container
        const pitchMapCheck = await page.evaluate(() => {
            // PitchMap usually has an image of a pitch or player nodes
            // Let's check if there are player names rendered
            // Better: search for "Donnarumma" or known player text
            return document.body.innerText.includes('Donnarumma');
        });
        if (pitchMapCheck) console.log('✅ PitchMap seems loaded (Found "Donnarumma").');
        else console.warn('⚠️ PitchMap might be empty or missing names.');

        // 6. Verify TeamMatchStats (The part fixed)
        // Look for "Analyse Aggrégée" or "Sélection des Matchs"
        const statsCheck = await page.evaluate(() => {
            const t = document.body.innerText.toUpperCase();
            return t.includes('ANALYSE AGGRÉGÉE') && t.includes('SÉLECTION DES MATCHS');
        });

        if (statsCheck) {
            console.log('✅ TeamMatchStats loaded (Found "Analyse Aggrégée").');
            // specific check for values to ensure they are not 0
            // Look for specific stat text like "Tirs totaux" followed by a number
        } else {
            console.error('❌ TeamMatchStats NOT found or empty.');
            // Check for "Aucune donnée disponible"
            const errorMsg = await page.evaluate(() => document.body.innerText.includes('Aucune donnée disponible'));
            if (errorMsg) console.error('❌ Error Message displayed: "Aucune donnée disponible"');
        }

    } catch (error) {
        console.error('❌ Verification FAILED:', error.message);
        // Take screenshot of failure
        await page.screenshot({ path: 'verification_failure.png' });
        console.log('Saved screenshot to verification_failure.png');
    } finally {
        await browser.close();
        console.log('--- Verification Complete ---');
    }
}

verifyFocusClub();
