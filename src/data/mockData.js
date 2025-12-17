export const TEAM_STATS = {
    "PSG": { goals: 2.8, corners: 6.5, possession: 65, defense: 80, discipline: 70 },
    "Marseille": { goals: 1.9, corners: 5.2, possession: 55, defense: 60, discipline: 50 },
    "Lyon": { goals: 1.5, corners: 4.8, possession: 50, defense: 55, discipline: 60 },
    "Monaco": { goals: 2.1, corners: 5.8, possession: 58, defense: 65, discipline: 75 },
    "Lens": { goals: 1.4, corners: 4.5, possession: 48, defense: 85, discipline: 80 },
    "Lille": { goals: 1.6, corners: 5.0, possession: 52, defense: 70, discipline: 70 }
};

export const MOCK_DATA = {
    seasonStats: {
        totalGoals: 482,
        goalsPerDay: 24.1,
        goalsPerMatch: 2.68
    },
    nextMatches: [
        {
            id: 1,
            homeTeam: "PSG",
            awayTeam: "Marseille",
            date: "2025-10-27",
            odds: { home: 1.45, draw: 4.20, away: 6.50 },
            prediction: {
                winner: "PSG",
                score: "3-1",
                confidence: 85,
                advice: "Plus de 2.5 buts"
            }
        },
        {
            id: 2,
            homeTeam: "Lyon",
            awayTeam: "Monaco",
            date: "2025-10-28",
            odds: { home: 2.80, draw: 3.40, away: 2.45 },
            prediction: {
                winner: "Monaco",
                score: "1-2",
                confidence: 60,
                advice: "Les deux équipes marquent"
            }
        }
    ],
    standings: [
        { rank: 1, team: "PSG", points: 24, played: 9, projectedPoints: 88, status: "live" },
        { rank: 2, team: "Monaco", points: 20, played: 9, projectedPoints: 76, status: "live" },
        { rank: 3, team: "Marseille", points: 18, played: 9, projectedPoints: 70, status: "live" },
        { rank: 4, team: "Lille", points: 16, played: 9, projectedPoints: 64, status: "live" },
        { rank: 5, team: "Lens", points: 15, played: 9, projectedPoints: 60, status: "live" },
        { rank: 6, team: "Lyon", points: 12, played: 9, projectedPoints: 50, status: "live" }
    ],
    players: [
        { name: "Mbappe (Legacy)", team: "PSG", form: 9.5, chanceGoal: 80, chanceAssist: 40, chanceCard: 10, status: "form" },
        { name: "Dembele", team: "PSG", form: 8.0, chanceGoal: 30, chanceAssist: 70, chanceCard: 20, status: "form" },
        { name: "Aubameyang", team: "Marseille", form: 7.5, chanceGoal: 50, chanceAssist: 20, chanceCard: 15, status: "neutral" },
        { name: "Lacazette", team: "Lyon", form: 4.0, chanceGoal: 20, chanceAssist: 10, chanceCard: 30, status: "slump" }
    ],
    history: {
        "PSG": {
            lastHome: ["W 4-0", "W 3-1", "W 2-0", "D 1-1", "W 5-0"],
            lastAway: ["W 2-1", "D 0-0", "W 3-0"]
        },
        "Marseille": {
            lastHome: ["W 2-0", "L 0-1", "W 3-2"],
            lastAway: ["L 1-3", "D 2-2", "W 1-0", "L 0-4", "D 1-1"]
        },
        h2h: [
            { date: "2024-03-31", home: "Marseille", away: "PSG", score: "0-2" },
            { date: "2023-09-24", home: "PSG", away: "Marseille", score: "4-0" },
            { date: "2023-02-26", home: "Marseille", away: "PSG", score: "0-3" }
        ]
    }
};
