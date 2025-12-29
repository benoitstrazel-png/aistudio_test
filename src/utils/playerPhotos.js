
import playerPhotosData from '../data/player_photos.json';

const CLUB_MAP = {
    'PSG': 'Paris Saint-Germain',
    'Marseille': 'Olympique de Marseille',
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

    if (!players || players.length === 0) {
        // Fallback search in all clubs (for transfers or map mismatches)
        // But let's stay efficient for now
        return null;
    }

    const normTarget = normalize(playerName);

    // Try exact match
    const exact = players.find(p => normalize(p.name) === normTarget);
    if (exact) return exact.photo;

    // Try partial match (lastName overlap)
    const lastName = playerName.split(' ').pop();
    const normLastName = normalize(lastName);

    const partial = players.find(p => normalize(p.name).includes(normLastName));
    return partial ? partial.photo : null;
};
