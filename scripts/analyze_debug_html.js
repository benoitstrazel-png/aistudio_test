
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlPath = path.join(__dirname, '../debug_page.html');
const html = fs.readFileSync(htmlPath, 'utf-8');

console.log(`File size: ${html.length} chars`);

const target = "Mayulu";
const targetIndex = html.indexOf(target);

if (targetIndex !== -1) {
    console.log(`Found "${target}" at index ${targetIndex}`);

    // Find the start of the row (search backwards for smv__participantRow)
    const rowStartMarker = 'smv__participantRow';
    const rowStartIndex = html.lastIndexOf(rowStartMarker, targetIndex);

    if (rowStartIndex !== -1) {
        console.log(`Row start found at ${rowStartIndex}`);
        // Print a chunk starting from rowStartIndex
        const chunk = html.slice(rowStartIndex - 50, rowStartIndex + 800);
        console.log("\n--- ROW CONTENT ---\n");
        console.log(chunk);
        console.log("\n-------------------\n");
    } else {
        console.log("Could not find row start before target.");
    }

} else {
    console.log(`Target "${target}" not found.`);
}
