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
                // For now, if local and no kaggle, we might skip, but for this task we assume env is set up
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
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

    // Find indices
    const indices = {};
    for (const [key, search] of Object.entries(COL_MAPPING)) {
        const idx = headers.indexOf(search);
        if (idx !== -1) indices[key] = idx;
    }

    // Explicitly find the 'Comp' column as requested
    const leagueIdx = headers.findIndex(h => h === 'Comp');

    const results = [];

    for (let i = 1; i < lines.length; i++) {
        // Simple split handling quotes roughly if needed, but these datasets are usually standard
        // A robust regex for CSV split: 
        const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!row) continue;

        // Clean quotes
        const cleanRow = row.map(val => val ? val.replace(/^"|"$/g, '').trim() : '');

        // Check League strictly for 'fr Ligue 1' in 'Comp' column
        const league = leagueIdx !== -1 ? cleanRow[leagueIdx] : '';
        if (league !== 'fr Ligue 1') continue;

        const playerObj = {};
        for (const [key, idx] of Object.entries(indices)) {
            let val = cleanRow[idx];
            // Convert numbers
            if (['Age', 'MP', 'Starts', 'Min', 'Gls', 'Ast'].includes(key)) val = parseInt(val) || 0;
            if (['xG', 'npxG', 'xAG'].includes(key)) val = parseFloat(val) || 0;
            playerObj[key] = val;
        }

        results.push(playerObj);
    }
    return results;
};

const processFiles = async () => {
    try {
        await downloadData();

        // Find the CSV file (it might have a variable name)
        const files = fs.readdirSync(DATA_DIR);
        const csvFile = files.find(f => f.endsWith('.csv') && !f.includes('ligue1_calendar')); // Exclude existing calendar if any

        if (!csvFile) {
            throw new Error('No new CSV file found after download.');
        }

        console.log(`Processing file: ${csvFile}`);
        const content = fs.readFileSync(path.join(DATA_DIR, csvFile), 'utf-8');
        const extracted = parseCSV(content);

        console.log(`Found ${extracted.length} players for Ligue 1.`);

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(extracted, null, 2));
        console.log(`Saved to ${OUTPUT_FILE}`);

        // Cleanup: delete the csv to keep repo clean? Or keep it. Let's delete to save space
        fs.unlinkSync(path.join(DATA_DIR, csvFile));

    } catch (err) {
        console.error('Failed to update player data:', err);
        process.exit(1);
    }
};

processFiles();
