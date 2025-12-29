
import playerPhotosData from '../data/player_photos.json';

const CLUB_MAP = {
    'PSG': 'Paris Saint-Germain',
    'Marseille': 'Olympique De Marseille',
    'Lyon': 'Olympique Lyonnais',
    'Monaco': 'As Monaco',
    'Lille': 'LOSC Lille',
    'Lens': 'Rc Lens',
    'Rennes': 'Stade Rennais Fc',
    'Nice': 'Ogc Nice',
    'Brest': 'Stade Brestois 29',
    'Reims': 'Stade de Reims',
    'Strasbourg': 'Rc Strasbourg Alsace',
    'Toulouse': 'Toulouse Fc',
    'Montpellier': 'Montpellier Hérault Sc',
    'Angers': 'Angers Sco',
    'Auxerre': 'Aj Auxerre',
    'Nantes': 'Fc Nantes',
    'Le Havre': 'Havre Athletic Club',
    'Paris FC': 'Paris Fc',
    'St Etienne': 'As Saint-Étienne',
    'Lorient': 'Fc Lorient',
    'Metz': 'Fc Metz'
};

/**
 * Normalizes a name for matching (removes accents, lowercase, etc.)
 */
const normalize = (name) => {
    if (!name) return "";
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z0-9]/g, ""); // Remove non-alphanumeric
};

/**
 * Finds a player's photo URL
 */
export const getPlayerPhoto = (clubName, playerName) => {
    const officialClubName = CLUB_MAP[clubName] || clubName;
    const players = playerPhotosData[officialClubName];

    const normTarget = normalize(playerName);

    // Helper: Try to find a match in a specific list of players
    const findInList = (list) => {
        if (!list) return null;

        // 1. Exact Match
        const exact = list.find(p => normalize(p.name) === normTarget);
        if (exact) return exact.photo;

        // 2. "Name I." Handling (e.g. "Doumbia K." -> match "Doumbia")
        // Also handles "Labeau Lascary R." -> match "Labeau Lascary"
        const parts = playerName.split(' ').filter(p => p.length > 2); // Ignore "K.", "J."
        if (parts.length > 0) {
            // Try to match significant parts
            for (let part of parts) {
                const normPart = normalize(part);
                // Check if any player contains this significant part
                const partial = list.find(p => {
                    const pNorm = normalize(p.name);
                    return pNorm.includes(normPart);
                });
                if (partial) return partial.photo;
            }
        }

        // 3. Fallback: LastName Partial Match (Original logic, but safer)
        const lastName = playerName.split(' ').pop();
        if (lastName.length > 2) {
            const normLastName = normalize(lastName);
            const partial = list.find(p => normalize(p.name).includes(normLastName));
            if (partial) return partial.photo;
        }

        return null;
    };

    // A. Strategy: Search in Target Club First
    const clubMatch = findInList(players);
    if (clubMatch) return clubMatch;

    // B. Strategy: Global Search (if transient player is actually from another club, e.g. Chotard)
    // This is expensive but necessary for "Loan/Transfer" or "Data Mismatch" cases.
    for (const [cName, cPlayers] of Object.entries(playerPhotosData)) {
        if (cName === officialClubName) continue; // Already checked
        const globalMatch = findInList(cPlayers);
        if (globalMatch) return globalMatch;
    }

    // C. Strategy: Static DB Fallback (for players like Sbai present in DB but not in photos file)
    // Note: This requires PLAYERS_DB to be imported. We assume it has a "Photo" field (e.g. from FBref/Scraper)
    // Since we can't easily import large JSON here without side effects, we rely on the component passing it? 
    // OR we just import it. Let's try importing.
    // Actually, to avoid circular deps or large bundles, we can just return null.
    // BUT the user says Sbai works in "Focus Joueurs". Focus probably uses the DB directly.
    // If we want it in PitchMap, we need it here.

    // For now, let's strictly fix Sbai if we can, or better: 
    // PitchMap.jsx passes the player object from roster which HAS the photo!
    // We should check if the caller provided a photo URL fallback? use that.

    return null;
};
