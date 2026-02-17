const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
    console.log("Launching browser...");
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set large viewport to see everything
    await page.setViewport({ width: 1920, height: 1080 });

    try {
        console.log("Navigating to Match Focus...");
        await page.goto('http://localhost:5173/match-focus', { waitUntil: 'networkidle0' });

        console.log("Waiting for key elements...");
        // Wait for the pitch
        await page.waitForSelector('.bg-\\[\\#1a4f1a\\]');
        // Wait for a player list item (bench)
        await page.waitForSelector('.card.glass-panel');

        console.log("Taking screenshot...");
        const screenshotPath = path.resolve(__dirname, '..', 'verification_match_focus_ui.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Screenshot saved to: ${screenshotPath}`);

        // Check for specific text content to verify UI Reactivity
        const content = await page.content();
        if (content.includes("Domicile") && content.includes("Extérieur")) {
            console.log("SUCCESS: Tactical Boards are present.");
        } else {
            console.error("ERROR: Tactical Boards text not found.");
        }

        // INTERACTION TEST: Click a Goalkeeper slot
        console.log("Attempting to click a GK slot...");
        // The slots are mapped. the GK slot is usually at the bottom.
        // We need a selector. The slots are divs with absolute positioning.
        // Let's rely on the label "G" which is rendered when empty.

        // Find element with text "G"
        const gkSlots = await page.$$("xpath/.//span[contains(text(), 'G')]");
        if (gkSlots.length > 0) {
            await gkSlots[0].click();
            console.log("Clicked GK slot.");

            await new Promise(r => setTimeout(r, 2000)); // Wait for drawer

            const drawerContent = await page.content();
            if (drawerContent.includes("Sélectionner Joueur")) {
                console.log("SUCCESS: Player Picker Drawer opened.");

                // Check if players are listed
                const players = await page.$$("xpath/.//div[contains(@class, 'hover:bg-white/10')]"); // Class used in player list items
                if (players.length > 0) {
                    console.log(`SUCCESS: Found ${players.length} players in the drawer.`);

                    // Take a screenshot of the drawer
                    const drawerScreenshotPath = path.join(__dirname, 'verification_match_focus_drawer.png');
                    await page.screenshot({ path: drawerScreenshotPath });
                    console.log(`Drawer screenshot saved to: ${drawerScreenshotPath}`);
                } else {
                    console.error("ERROR: No players found in the drawer.");
                }

            } else {
                console.error("ERROR: Player Picker Drawer did not open.");
            }
        } else {
            console.error("ERROR: Could not find GK slot to click.");
        }
    } catch (error) {
        console.error("Error during verification:", error);
    } finally {
        await browser.close();
    }
})();
