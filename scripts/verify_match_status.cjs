
const fs = require('fs');
const path = require('path');

const APP_DATA = require('../src/data/app_data.json');
const HISTORY = require('../src/data/predictions_history.json');

const targetId = "8n9dHuun";
const match = APP_DATA.fullSchedule.find(m => m.id === targetId);
const prediction = HISTORY[0].predictions.find(p => p.id === targetId);

console.log(`Checking match ${targetId}...`);
if (match) {
    console.log(`Match FOUND in app_data.json:`);
    console.log(`Status: ${match.status}`);
    console.log(`Score:`, match.score);
    console.log(`Week: ${match.week}`);
} else {
    console.log(`Match NOT FOUND in app_data.json`);
}

if (prediction) {
    console.log(`Prediction FOUND in history:`);
    console.log(`Prediction:`, prediction.prediction);
} else {
    // Search in other snapshots
    let found = false;
    HISTORY.forEach(snap => {
        const p = snap.predictions.find(pred => pred.id === targetId);
        if (p) {
            console.log(`Prediction FOUND in snapshot Week ${snap.sourceWeek}`);
            found = true;
        }
    });
    if (!found) console.log(`Prediction NOT FOUND in history`);
}
