// Force Vercel Update
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../src/data');
const OUTPUT_FILE = path.join(__dirname, '../public/data/players_db.json');
const DATASET_ID = 'hubertsidorowicz/football-players-stats-2025-2026';

// Map CSV columns to JSON keys for Frontend Compatibility
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
    'xAG': 'xAG',
    'Comp': 'League',
    'Competition': 'League'
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
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    console.log('Detected Headers:', headers);

    const results = [];

    // Pre-calculate column mapping
    const headerConfigs = headers.map((h, idx) => {
        // Try to find a match in COL_MAPPING (case-insensitive)
        const mappedKey = Object.keys(COL_MAPPING).find(k =>
            k.toLowerCase() === h.toLowerCase()
        );

        return {
            index: idx,
            finalName: mappedKey ? COL_MAPPING[mappedKey] : h
        };
    });

    for (let i = 1; i < lines.length; i++) {
        // Robust split: Match quoted strings OR non-comma sequences (allowing spaces)
        const row = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
        if (!row) continue;

        const cleanRow = row.map(val => val ? val.replace(/^"|"$/g, '').trim() : '');

        // Skip empty rows
        if (cleanRow.length < headers.length * 0.5) continue;

        const playerObj = {};

        headerConfigs.forEach(({ index, finalName }) => {
            let val = cleanRow[index];
            // Auto-detect numbers
            if (val && !isNaN(val) && val.trim() !== '') {
                // Check if it looks like an integer or float
                if (val.includes('.')) val = parseFloat(val);
                else val = parseInt(val);
            }
            playerObj[finalName] = val;
        });

        results.push(playerObj);
    }

    console.log(`Importing ALL players (Total parsed: ${results.length}). Keys normalized for frontend.`);
    return results;
};

const processFiles = async () => {
    try {
        console.log("Attempting to download data from Kaggle...");
        try {
            await downloadData();
        } catch (e) {
            console.warn("Download failed or Kaggle CLI not available. Checking for existing local CSV files...");
        }

        const files = fs.readdirSync(DATA_DIR);
        // Find any CSV that is not the calendar
        const csvFile = files.find(f => f.endsWith('.csv') && !f.includes('ligue1_calendar'));

        if (!csvFile) {
            throw new Error('No player stats CSV file found in src/data. Please place the Kaggle CSV export there manually if download fails.');
        }

        console.log(`Processing file: ${csvFile}`);
        const content = fs.readFileSync(path.join(DATA_DIR, csvFile), 'utf-8');
        const extracted = parseCSV(content);

        console.log(`Found ${extracted.length} records.`);

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(extracted, null, 2));
        console.log(`Saved to ${OUTPUT_FILE}`);

    } catch (err) {
        console.error('Failed to update player data:', err);
        process.exit(1);
    }
};

processFiles();
