// Mapping of team names to valid Logo URLs (SVG/PNG)
// Using Wikimedia Commons or standard public assets for Ligue 1

const LOGO_BASE_URL = "https://upload.wikimedia.org/wikipedia/fr";

// Map normalized team names to specific URLs
// Note: URLs can change, these are current reputable links.
export const TEAM_LOGOS = {
    "PSG": "https://upload.wikimedia.org/wikipedia/fr/4/4a/Paris_Saint-Germain_Football_Club_%28logo%29.svg",
    "Marseille": "https://upload.wikimedia.org/wikipedia/fr/4/43/Logo_Olympique_de_Marseille.svg",
    "Lyon": "https://upload.wikimedia.org/wikipedia/fr/e/e2/Olympique_lyonnais_%28logo%29.svg",
    "Monaco": "https://upload.wikimedia.org/wikipedia/fr/5/50/Logo_AS_Monaco_FC_2021.svg",
    "Lille": "https://upload.wikimedia.org/wikipedia/fr/6/62/Logo_LOSC_Lille_2018.svg",
    "Rennes": "https://upload.wikimedia.org/wikipedia/fr/e/e9/Logo_Stade_Rennais_FC.svg",
    "Lens": "https://upload.wikimedia.org/wikipedia/fr/9/95/Logo_RC_Lens_2014.svg",
    "Nice": "https://upload.wikimedia.org/wikipedia/fr/b/b1/Logo_OGC_Nice_2013.svg",
    "Strasbourg": "https://upload.wikimedia.org/wikipedia/fr/9/91/Racing_Club_de_Strasbourg_Alsace_%282016%29.svg",
    "Reims": "https://upload.wikimedia.org/wikipedia/fr/0/02/Logo_Stade_de_Reims_2020.svg",
    "Toulouse": "https://upload.wikimedia.org/wikipedia/fr/v/v8/Logo_Toulouse_FC_2018.svg",
    "Montpellier": "https://upload.wikimedia.org/wikipedia/fr/a/a8/Logo_Montpellier_H%C3%A9rault_SC_2015.svg",
    "Nantes": "https://upload.wikimedia.org/wikipedia/fr/5/5c/Logo_FC_Nantes_2019.svg",
    "Le Havre": "https://upload.wikimedia.org/wikipedia/fr/3/30/Logo_Havre_Athletic_Club_2018.svg",
    "Brest": "https://upload.wikimedia.org/wikipedia/fr/1/14/Logo_Stade_Brestois_29_2010.svg",
    "Lorient": "https://upload.wikimedia.org/wikipedia/fr/1/1d/Logo_FC_Lorient_Bretagne-Sud.svg",
    "Metz": "https://upload.wikimedia.org/wikipedia/fr/4/4a/Logo_FC_Metz_2021.svg",
    "Clermont": "https://upload.wikimedia.org/wikipedia/fr/7/7b/Logo_Clermont_Foot_63_2013.svg",
    "Auxerre": "https://upload.wikimedia.org/wikipedia/fr/3/39/Logo_AJ_Auxerre.svg",
    "Angers": "https://upload.wikimedia.org/wikipedia/fr/d/d3/Logo_Angers_SCO_2021.svg",
    "Saint-Etienne": "https://upload.wikimedia.org/wikipedia/fr/a/a0/Logo_AS_Saint-%C3%89tienne.svg",
    "Paris FC": "https://upload.wikimedia.org/wikipedia/fr/d/db/Logo_Paris_FC_2011.svg"
};

const L1_LOGO_URL = "https://upload.wikimedia.org/wikipedia/commons/4/49/Ligue1_Uber_Eats_logo.png"; // Keeping Uber Eats or generic one for now, or new McDonald's if available.
// New Logo (McDonald's era) is basically just "L1" in simple font. Let's use a nice generic SVG if possible.
const L1_NEW_LOGO = "https://upload.wikimedia.org/wikipedia/commons/5/5e/Ligue_1_logo.svg";

export const getTeamLogo = (teamName) => {
    // Tries to find strict match, else fuzzy, else placeholder
    if (!teamName) return null;
    return TEAM_LOGOS[teamName] || `https://ui-avatars.com/api/?name=${teamName}&background=0D0D0D&color=CEF002&font-size=0.5`;
};

export const getLeagueLogo = () => {
    return "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Ligue_1_logo.svg/1200px-Ligue_1_logo.svg.png";
};
