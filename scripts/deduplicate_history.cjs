
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '../src/data/matches_history_detailed.json');

function deduplicate() {
    if (!fs.existsSync(FILE)) {
        console.error("File not found");
        return;
    }

    const data = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
    console.log(`Initial count: ${data.length}`);

    const unique = new Map();

    data.forEach(match => {
        // Extract ID
        let id = null;
        const url = match.url;
        if (url) {
            const shortMatch = url.match(/\/match\/([A-Za-z0-9]+)/);
            if (shortMatch && shortMatch[1]) id = shortMatch[1];
            else {
                const midMatch = url.match(/[?&]mid=([A-Za-z0-9]+)/);
                if (midMatch && midMatch[1]) id = midMatch[1];
            }
        }

        if (id) {
            // Keep the one with most events if duplicate? Or just last one?
            // Usually the latest scrape is better (has subs).
            // Let's check if we already have it.
            if (unique.has(id)) {
                const existing = unique.get(id);
                // Heuristic: Prefer one with events
                if ((match.events?.length || 0) > (existing.events?.length || 0)) {
                    unique.set(id, match);
                }
                // If equal, keep existing (earlier in list? or later?) 
                // Actually array order: later elements overwrite earlier in a Map if we blindly set. 
                // But here we are iterating.
                // Let's just blindly overwrite if we assume the file is appended to?
                // No, standard `unique.set(id, match)` keeps the LAST one if we iterate forward.
                // But let's be smart: Keep the one with SUBS if possible.
                else if (!existing.events?.some(e => e.type === 'Substitution') && match.events?.some(e => e.type === 'Substitution')) {
                    unique.set(id, match);
                }
            } else {
                unique.set(id, match);
            }
        }
    });

    const cleaned = Array.from(unique.values());
    console.log(`Cleaned count: ${cleaned.length}`);

    fs.writeFileSync(FILE, JSON.stringify(cleaned, null, 2));
    console.log("File saved.");
}

deduplicate();
