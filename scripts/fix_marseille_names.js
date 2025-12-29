import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PHOTOS_FILE = path.join(__dirname, '../src/data/player_photos.json');
const PLAYERS_FILE = path.join(__dirname, '../src/data/real_players.json');

// Load both files
const photosData = JSON.parse(fs.readFileSync(PHOTOS_FILE, 'utf8'));
const playersData = JSON.parse(fs.readFileSync(PLAYERS_FILE, 'utf8'));

// Manual mapping of first names to full names for Marseille
// This will be based on the URLs we have (which are correct) and the player roster
const MARSEILLE_NAME_FIXES = {
    "Géronimo": "Géronimo Rulli",
    "Jeffrey": "Jeffrey de Lange",
    "Théo": "Théo Ortiz",  // Could be multiple Théo - need to check
    "Conrad Jaden": "Conrad Jaden Harder",
    "Leonardo": "Leonardo Balerdi",
    "Ulisses": "Ulisses Garcia",
    "Nayef": "Nayef Aguerd",
    "Timothy": "Timothy Pembele",
    "Benjamin": "Benjamin Mendy",
    "Facundo": "Facundo Medina",
    "Emerson": "Emerson",  // Single name player
    "Amir": "Amir Murillo",
    "Matt": "Matt O'Riley",
    "Arthur": "Arthur Atta",
    "Geoffrey": "Geoffrey Kondogbia",
    "Hamed Junior": "Hamed Junior Traore",
    "Pierre-Emile": "Pierre-Emile Hojbjerg",
    "Bilal": "Bilal Nadir",
    "Darryl": "Darryl Bakola",
    "Neal": "Neal Maupay",
    "Angel": "Angel Gomes",
    "Amine": "Amine Harit",
    "Mason": "Mason Greenwood",
    "Igor": "Igor Chepcurov",
    "Robinio": "Robinio Vaz",
    "Keyliane": "Keyliane Abdallah",
    "Pierre-Emerick": "Pierre-Emerick Aubameyang"
};

const REIMS_NAME_FIXES = {
    "Alexandre": "Alexandre Olliero",
    "Ewen": "Ewen Jauregi",
    "Soumaila": "Soumaila Coulibaly",
    "Joseph": "Joseph Okumu",
    "Hiroki": "Hiroki Ito",
    "Maxime": "Maxime Busi",
    "Nicolas": "Nicolas Dacourt",
    "Sergio": "Sergio Akieme",
    "N'tamon Elie": "Elie N'Tamon",
    "Abdoul": "Abdoul Kone",
    "Théo": "Theo Vermot",
    "Yaya": "Yaya Fofana",
    "Teddy": "Teddy Teuma",
    "Yohan": "Yohan Cassubie",
    "Mory": "Mory Diaw",
    "John": "John Folly",
    "Thiemoko": "Thiemoko Diarra",
    "Patrick": "Patrick Delele",
    "Martial": "Martial Bouli Bouli",
    "Mohamed": "Mohamed Bamba",
    "Amine": "Amine Salama",
    "Keito": "Keito Nakamura",
    "Adama": "Adama Bojang",
    "Norman": "Norman Bassette",
    "Hafiz Umar": "Hafiz Umar Ibrahim"
};

const SAINTETIENNE_NAME_FIXES = {
    "Lucas": "Lucas Carouges", // could be multiple
    "Matvey": "Matvey Safonov",
    "Renato": "Renato Sanches",
    "Achraf": "Achraf Hakimi",
    "Marquinhos": "Marquinhos",
    "Illia": "Illia Zabarnyi",
    "Nuno": "Nuno Mendes",
    "Noham": "Noham Emeran",
    "Willian": "Willian Pacho",
    "Fabian": "Fabian Rieder",
    "Désiré": "Desire Doue",
    "Vitinha": "Vitinha",
    "Lee": "Lee Kang-In",
    "Senny": "Senny Mayulu",
    "Warren": "Warren Zaire-Emery",
    "Joao": "Joao Neves",
    "Khvicha": "Khvicha Kvaratskhelia",
    "Gonçalo": "Goncalo Ramos",
    "Ousmane": "Ousmane Dembele",
    "Bradley": "Bradley Barcola",
    "Ibrahim": "Ibrahim Mbaye"
};

// Apply fixes
if (photosData["Olympique de Marseille"]) {
    photosData["Olympique de Marseille"] = photosData["Olympique de Marseille"].map(player => {
        const fullName = MARSEILLE_NAME_FIXES[player.name];
        if (fullName) {
            console.log(`Fixing: ${player.name} -> ${fullName}`);
            return { ...player, name: fullName };
        }
        return player;
    });
}

if (photosData["Stade de Reims"]) {
    photosData["Stade de Reims"] = photosData["Stade de Reims"].map(player => {
        const fullName = REIMS_NAME_FIXES[player.name];
        if (fullName) {
            console.log(`Fixing: ${player.name} -> ${fullName}`);
            return { ...player, name: fullName };
        }
        return player;
    });
}

if (photosData["As Saint-Étienne"]) {
    photosData["As Saint-Étienne"] = photosData["As Saint-Étienne"].map(player => {
        const fullName = SAINTETIENNE_NAME_FIXES[player.name];
        if (fullName) {
            console.log(`Fixing: ${player.name} -> ${fullName}`);
            return { ...player, name: fullName };
        }
        return player;
    });
}

// Save fixed data
fs.writeFileSync(PHOTOS_FILE, JSON.stringify(photosData, null, 2));
console.log('\n✅ Fixed player names in player_photos.json');
