
import CALCULATED_STATS from '../data/player_stats_calculated.json';
import TM_POSITIONS from '../data/player_positions_tm.json';

// No longer need static DB or manual normalization as the JSON has valid data
// But we might want to normalize search terms.

export const getAggregatedPlayerStats = () => {
    // CALCULATED_STATS is { "TeamName": [ { name, matchesPlayed, minutesPlayed, goals... } ] }

    let flatList = [];

    const normalize = (str) => str?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\./g, "").trim() || "";
    const calculateAge = (dobStr) => {
        if (!dobStr) return null;
        try {
            // Format: "24 janv. 1996" or "24 janv. 1996 (29)"
            const cleanStr = dobStr.replace(/\(.*\)/, '').trim();
            const parts = cleanStr.split(' ');
            if (parts.length < 3) return null;

            const day = parseInt(parts[0]);
            const year = parseInt(parts[2]);
            const monthStr = parts[1].toLowerCase().replace('.', '');

            const months = {
                'janv': 0, 'jan': 0, 'fevr': 1, 'fev': 1, 'mars': 2, 'mar': 2,
                'avr': 3, 'apr': 3, 'mai': 4, 'may': 4, 'juin': 5, 'jun': 5,
                'juil': 6, 'jul': 6, 'aout': 7, 'aug': 7, 'sept': 8, 'sep': 8,
                'oct': 9, 'nov': 10, 'dec': 11,
                'janvier': 0, 'février': 1, 'fevrier': 1, 'avril': 3, 'juillet': 6, 'août': 7,
                'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11, 'decembre': 11
            };

            const month = months[monthStr] !== undefined ? months[monthStr] : 0;
            const birthDate = new Date(year, month, day);
            const today = new Date();

            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age;
        } catch (e) {
            return null;
        }
    };

    const getAge = (name) => {
        const n = normalize(name);
        // Try exact match first
        let entry = TM_POSITIONS[name];

        // Try normalized search
        if (!entry) {
            for (const [key, val] of Object.entries(TM_POSITIONS)) {
                if (normalize(key) === n) { entry = val; break; }
            }
        }

        if (entry) {
            if (entry.birthDate) {
                const calculated = calculateAge(entry.birthDate);
                if (calculated) return calculated;
            }
            if (entry.age) return entry.age;
        }
        return 'N/A';
    };

    const COACHES_TO_EXCLUDE = [
        "Roberto De Zerbi", "Luis Enrique", "Luka Elsner", "Adi Hutter", "Liam Rosenior",
        "Carles Martinez", "Will Still", "Franck Haise", "Pierre Sage", "Bruno Genesio",
        "Antoine Kombouare", "Regis Le Bris", "Olivier Dall'Aglio", "Eric Roy", "Julien Stephan",
        "Patrick Vieira", "Sebastien Pocognoli", "Laszlo Boloni"
    ].map(n => normalize(n));

    Object.entries(CALCULATED_STATS).forEach(([teamName, players]) => {
        players.forEach(p => {
            const age = getAge(p.name);
            const pos = p.position || 'N/A';
            const nameNorm = normalize(p.name);

            // Normalize checks
            // 1. Explicit exclusion list
            if (COACHES_TO_EXCLUDE.some(c => nameNorm.includes(c))) return;

            // 2. Position check (if enriched data says Coach/Manager)
            // Note: Scraped data 'main' position might be 'Entraîneur'
            const scrapedEntry = TM_POSITIONS[p.name] || Object.values(TM_POSITIONS).find(v => v.name === p.name); // Simplified lookup
            if (scrapedEntry && (scrapedEntry.main === 'Entraîneur' || scrapedEntry.main === 'Manager')) return;

            flatList.push({
                Player: p.name,
                Squad: teamName, // Already normalized in Key but let's use the one in object
                Pos: pos,
                Age: age,
                MP: p.matchesPlayed,
                Min: p.minutesPlayed,
                Gls: p.goals,
                Ast: p.assists,
                xG: 0, // Not available in Lineups/History
                xAG: 0,
                Yellow: p.yellowCards,
                Red: p.redCards,
                League: 'fr Ligue 1'
            });
        });
    });

    return flatList;
};
