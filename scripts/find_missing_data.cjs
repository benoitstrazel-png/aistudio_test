const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../src/data/player_positions_tm.json');
const outputPath = path.join(__dirname, '../src/data/players_missing_info.json');

try {
    const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    const missingDataPlayers = {};

    const knownCoaches = [
        "Luis Enrique", "Roberto De Zerbi", "Adi Hütter", "Bruno Genesio", "Franck Haise",
        "Will Still", "Pierre Sage", "Liam Rosenior", "Eric Roy", "Didier Digard",
        "Antoine Kombouaré", "Olivier Dall'Oglio", "Michel Der Zakarian", "Jean-Louis Gasset",
        "Luka Elsner", "Christophe Pélissier", "Alexandre Dujeux", "Patrick Vieira",
        "Carles Martinez Novell", "Albert Riera", "Laszlo Boloni", "Pascal Gastien", "Regis Le Bris"
    ];

    for (const [playerName, info] of Object.entries(data)) {
        // Exclude coaches
        if (knownCoaches.some(coach => playerName.includes(coach))) {
            continue;
        }

        let reasons = [];

        // Check for error field
        if (info.error) {
            reasons.push(`Error: ${info.error}`);
        }

        // Check for missing or empty position (main)
        if (!info.main || info.main.trim() === '') {
            // If it's not already covered by the error check
            if (!info.error) reasons.push('Missing position');
        }

        // Check for missing or empty birthDate (age)
        if (!info.birthDate || info.birthDate.trim() === '') {
            // If it's not already covered by the error check, or if we want to be explicit
            if (!reasons.includes('Missing position') && !info.error) {
                reasons.push('Missing birthDate');
            } else if (!info.error) {
                reasons.push('Missing birthDate');
            }
        }

        // Also check explicit "age" field if birthDate is missing, just in case, but birthDate is the primary source.
        // The user asked for "age n'est pas indiqué".

        if (reasons.length > 0) {
            missingDataPlayers[playerName] = {
                ...info,
                missing_reasons: reasons
            };
        }
    }

    fs.writeFileSync(outputPath, JSON.stringify(missingDataPlayers, null, 2));
    console.log(`Found ${Object.keys(missingDataPlayers).length} players with missing data.`);
    console.log(`Results saved to ${outputPath}`);

} catch (err) {
    console.error('Error processing data:', err);
}
