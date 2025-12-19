// Mapping of team names to valid Logo URLs
// Using L'Equipe CDN for stubborn logos (Le Havre, Monaco) as they are extremely stable

const MANUAL_URLS = {
    // LE HAVRE (HAC) - Corrected with User URL
    "Le Havre": "https://i.pinimg.com/originals/a8/9e/11/a89e114b0c3e6021c03cb725307b18d8.png",
    "Le Havre AC": "https://i.pinimg.com/originals/a8/9e/11/a89e114b0c3e6021c03cb725307b18d8.png",
    "HAC": "https://i.pinimg.com/originals/a8/9e/11/a89e114b0c3e6021c03cb725307b18d8.png",

    // MONACO (ASM) - Source L'Equipe
    "Monaco": "https://medias.lequipe.fr/logo-football/25/200?20210705",
    "AS Monaco": "https://medias.lequipe.fr/logo-football/25/200?20210705",
    "ASM": "https://medias.lequipe.fr/logo-football/25/200?20210705",
    "MonacoMon": "https://medias.lequipe.fr/logo-football/25/200?20210705", // Cas spécifique vu dans les screenshots "MonacoMonMON"

    // NICE - Source L'Equipe (Au cas où)
    "Nice": "https://medias.lequipe.fr/logo-football/46/200?20210705",
    "OGC Nice": "https://medias.lequipe.fr/logo-football/46/200?20210705",

    // PARIS FC - Corrected URL
    "Paris FC": "https://upload.wikimedia.org/wikipedia/fr/thumb/d/db/Logo_Paris_FC_2011.svg/200px-Logo_Paris_FC_2011.svg.png"
};

const FOOTBALL_DATA_IDS = {
    // Ligue 1 Standard IDs (Football-Data.org)
    "PSG": 524, "Paris Saint-Germain": 524,
    "Marseille": 516, "OM": 516,
    "Lyon": 523, "OL": 523,
    "Lille": 521, "LOSC": 521,
    "Rennes": 529, "Stade Rennais": 529,
    "Nantes": 543, "FCN": 543,
    "Lorient": 525, "FCL": 525,
    "Brest": 512, "Stade Brestois": 512, "SB29": 512,
    "Reims": 547, "Stade de Reims": 547,
    "Montpellier": 518, "MHSC": 518,
    "Toulouse": 511, "TFC": 511,
    "Strasbourg": 576, "RCSA": 576,
    "Lens": 546, "RCL": 546,
    "Angers": 532, "SCO": 532,
    "Metz": 545, "FCM": 545,
    "Auxerre": 519, "AJA": 519,
    "Saint-Etienne": 527, "ASSE": 527,
    "Clermont": 541
};

export const getTeamLogo = (teamName) => {
    if (!teamName) return null;

    // 1. Check Manual URLs first (Strict & Partial)
    // Correction: Priority to exact match, then partial
    if (MANUAL_URLS[teamName]) return MANUAL_URLS[teamName];
    const manualKey = Object.keys(MANUAL_URLS).find(k => teamName.includes(k));
    if (manualKey) return MANUAL_URLS[manualKey];

    // 2. Football-Data.org IDs
    let id = FOOTBALL_DATA_IDS[teamName];
    if (!id) {
        const lowerName = teamName.toLowerCase();
        const key = Object.keys(FOOTBALL_DATA_IDS).find(k => {
            const kLow = k.toLowerCase();
            return kLow === lowerName || lowerName.includes(kLow) || kLow.includes(lowerName);
        });
        if (key) id = FOOTBALL_DATA_IDS[key];
    }

    if (id) {
        return `https://crests.football-data.org/${id}.svg`;
    }

    return `https://ui-avatars.com/api/?name=${teamName}&background=0D0D0D&color=CEF002&font-size=0.5`;
};

export const getLeagueLogo = () => {
    return "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Ligue1_Uber_Eats_logo.png/600px-Ligue1_Uber_Eats_logo.png";
};
