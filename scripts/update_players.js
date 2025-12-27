import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../src/data');
const OUTPUT_FILE = path.join(DATA_DIR, 'players_ligue1.json');
const DATASET_ID = 'hubertsidorowicz/football-players-stats-2025-2026';

// Map CSV columns to JSON keys
const COL_MAPPING = {
    'Player': 'Player',
    'Nation': 'Nation',
    'Pos': 'Pos',
    'Squad': 'Squad',
    'Age': 'Age',
    'MP': 'MP',
    'Starts': 'Starts',
    'Min': 'Min',
    'Gls': 'Gls',
    'Ast': 'Ast',
    'xG': 'xG',
    'npxG': 'npxG',
    'xAG': 'xAG'
};

const downloadData = () => {
    console.log(`Downloading dataset ${DATASET_ID}...`);
    return new Promise((resolve, reject) => {
        exec(`kaggle datasets download -d ${DATASET_ID} -p "${DATA_DIR}" --unzip --force`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error downloading dataset: ${error.message}`);
                reject(error);
                return;
            }
            if (stderr) console.log(`Stderr: ${stderr}`);
            console.log(stdout);
            resolve();
        });
    });
};

const parseCSV = (content) => {
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length === 0) return [];

    // Parse Headers
    // Handle potential surrounding quotes in headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    console.log('Detected Headers:', headers);

    // Dynamic Column Mapping
    const indices = {};
    for (const [key, search] of Object.entries(COL_MAPPING)) {
        // loose matching for headers
        const idx = headers.findIndex(h => h === search || h.toLowerCase() === search.toLowerCase());
        if (idx !== -1) indices[key] = idx;
    }
    console.log('Column Indices mapped:', indices);

    // SMART DETECTION for League Column
    // Instead of trusting "Comp", let's find which column actually contains "Ligue 1"
    let leagueIdx = headers.findIndex(h => h === 'Comp' || h === 'Competition');

    // Scan first 100 rows to find "Ligue 1" and confirm/find the column
    let detectedLeagueIdx = -1;
    let foundLigue1 = false;

    for (let i = 1; i < Math.min(lines.length, 100); i++) {
        const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!row) continue;
        const cleanRow = row.map(val => val ? val.replace(/^"|"$/g, '').trim() : '');

        // Search all columns for "Ligue 1"
        cleanRow.forEach((val, idx) => {
            if (val && val.includes('Ligue 1')) {
                if (detectedLeagueIdx === -1) detectedLeagueIdx = idx;
                foundLigue1 = true;
            }
        });
        if (foundLigue1 && detectedLeagueIdx !== -1) break;
    }

    if (detectedLeagueIdx !== -1) {
        console.log(`Auto-detected 'Ligue 1' data in column index: ${detectedLeagueIdx} (Header: "${headers[detectedLeagueIdx] || 'Unknown'}")`);
        leagueIdx = detectedLeagueIdx;
    } else {
        console.warn("Could not auto-detect 'Ligue 1' in the first 100 rows. Falling back to 'Comp' header or index 0.");
        if (leagueIdx === -1) leagueIdx = 0; // Fallback
    }

    const results = [];
    const uniqueLeagues = new Set();

    for (let i = 1; i < lines.length; i++) {
        // Robust split
        const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!row) continue;

        const cleanRow = row.map(val => val ? val.replace(/^"|"$/g, '').trim() : '');

        // Check League using the detected index
        const league = cleanRow[leagueIdx] || '';
        uniqueLeagues.add(league);

        // Relaxed filtering: includes "Ligue 1" (handles "fr Ligue 1", "Ligue 1 Uber Eats", etc.)
        if (!league.includes('Ligue 1')) continue;

        const playerObj = {};
        for (const [key, idx] of Object.entries(indices)) {
            let val = cleanRow[idx];
            // Number conversion
            if (['Age', 'MP', 'Starts', 'Min', 'Gls', 'Ast'].includes(key)) val = parseInt(val) || 0;
            if (['xG', 'npxG', 'xAG'].includes(key)) val = parseFloat(val) || 0;
            playerObj[key] = val;
        }
        results.push(playerObj);
    }

    console.log(`First 10 distinct values in League Column (${leagueIdx}):`, Array.from(uniqueLeagues).slice(0, 10));
    return results;
};

const processFiles = async () => {
    try {
        await downloadData();

        const files = fs.readdirSync(DATA_DIR);
        const csvFile = files.find(f => f.endsWith('.csv') && !f.includes('ligue1_calendar'));

        if (!csvFile) {
            throw new Error('No new CSV file found after download.');
        }

        console.log(`Processing file: ${csvFile}`);
        const content = fs.readFileSync(path.join(DATA_DIR, csvFile), 'utf-8');
        const extracted = parseCSV(content);

        console.log(`Found ${extracted.length} players for Ligue 1.`);

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(extracted, null, 2));
        console.log(`Saved to ${OUTPUT_FILE}`);

        fs.unlinkSync(path.join(DATA_DIR, csvFile));

    } catch (err) {
        console.error('Failed to update player data:', err);
        process.exit(1);
    }
};

processFiles();
