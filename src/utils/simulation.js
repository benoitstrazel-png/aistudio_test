// List of strict 18 teams for 2025-2026 Season (Reference)
const L1_TEAMS_REF = [
    "Angers", "Auxerre", "Brest", "Le Havre", "Lens", "Lille",
    "Lorient", "Lyon", "Marseille", "Metz", "Monaco", "Montpellier",
    "Nantes", "Nice", "PSG", "Reims", "Rennes", "Saint-Etienne", "Strasbourg", "Toulouse"
].sort();

/**
 * Helper to normalize team names for better matching
 */
const normalize = (name) => {
    if (!name) return "";
    const n = name.toLowerCase();

    // Explicitly handle Paris FC FIRST to avoid it being caught by "paris"
    if (n.includes("paris fc") || n === "pfc") return "Paris FC";

    if (n.includes("paris") || n === "psg") return "PSG";
    if (n.includes("marseille") || n === "om") return "Marseille";
    if (n.includes("lyon") || n === "ol") return "Lyon";
    if (n.includes("monaco") || n === "asm") return "Monaco";
    if (n.includes("etienne") || n === "asse") return "Saint-Etienne";
    if (n.includes("brest")) return "Brest";
    if (n.includes("havre") || n === "hac") return "Le Havre";
    if (n.includes("nice")) return "Nice";
    if (n.includes("lille") || n === "losc") return "Lille";
    if (n.includes("rennes")) return "Rennes";
    if (n.includes("nantes")) return "Nantes";
    if (n.includes("reims")) return "Reims";
    if (n.includes("montpellier")) return "Montpellier";
    if (n.includes("toulouse")) return "Toulouse";
    if (n.includes("strasbourg")) return "Strasbourg";
    if (n.includes("lens")) return "Lens";
    if (n.includes("lorient")) return "Lorient";
    if (n.includes("metz")) return "Metz";
    if (n.includes("auxerre")) return "Auxerre";
    if (n.includes("angers") || n === "sco") return "Angers";

    return name; // Return original if no alias match
};

// Helper to init team object
const initTeam = (id, displayName) => ({
    id: id,
    name: displayName, // Will be overwritten if multiple variants exist, but typically okay
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    points: 0,
    form: []
});

export const calculateStandingsAtWeek = (currentStandings, schedule, targetWeek, currentWeek) => {
    const teams = {};
    const processedMatchIds = new Set(); // To prevent duplicates (PSG x2 issue)

    // 1. First Pass: Identify all ACTIVE teams in the schedule
    // This avoids showing teams with 0 points that aren't actually in the season
    schedule.forEach(match => {
        if (match.homeTeam) teams[normalize(match.homeTeam)] = initTeam(normalize(match.homeTeam), match.homeTeam);
        if (match.awayTeam) teams[normalize(match.awayTeam)] = initTeam(normalize(match.awayTeam), match.awayTeam);
    });

    // 2. Process matches
    schedule.forEach(match => {
        if (!match.week || match.week > targetWeek) return;
        if (processedMatchIds.has(match.id)) return; // CHANGE: Prevent double counting

        processedMatchIds.add(match.id);

        // Determine scores
        let homeScore = null;
        let awayScore = null;

        // Historic or Live Match (Status Finished)
        if (match.status === 'FINISHED') {
            homeScore = match.score.home;
            awayScore = match.score.away;
        }
        // Future/Scheduled but within target simulation week
        else if (match.week <= targetWeek && match.prediction?.score) {
            const parts = match.prediction.score.split('-');
            if (parts.length === 2) {
                homeScore = parseInt(parts[0]);
                awayScore = parseInt(parts[1]);
            }
        }

        // Apply Stats if we have a valid score
        if (homeScore !== null && awayScore !== null) {
            const hKey = normalize(match.homeTeam);
            const aKey = normalize(match.awayTeam);

            const h = teams[hKey];
            const a = teams[aKey];

            if (h && a) {
                h.played++;
                a.played++;
                h.gf += homeScore;
                h.ga += awayScore;
                h.gd = h.gf - h.ga;
                a.gf += awayScore;
                a.ga += homeScore;
                a.gd = a.gf - a.ga;

                if (homeScore > awayScore) {
                    h.won++; h.points += 3; h.form.push('W');
                    a.lost++; a.form.push('L');
                } else if (awayScore > homeScore) {
                    a.won++; a.points += 3; a.form.push('W');
                    h.lost++; h.form.push('L');
                } else {
                    h.drawn++; h.points += 1; h.form.push('D');
                    a.drawn++; a.points += 1; a.form.push('D');
                }
            }
        }
    });

    // 3. Format & Sort
    const newStandings = Object.values(teams);
    newStandings.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.gd !== a.gd) return b.gd - a.gd;
        return b.gf - a.gf;
    });

    // Add Rank
    newStandings.forEach((t, index) => {
        t.rank = index + 1;
        t.recentForm = t.form.slice(-5);
    });

    return newStandings;
};
