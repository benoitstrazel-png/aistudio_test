// Basic recreation of the prediction logic to investigate 0-0 bias
const predictMatchLiveMock = (home, away, stats) => {
    const sh = stats[home] || { att: 1, def: 1 };
    const sa = stats[away] || { att: 1, def: 1 };

    const homeStrength = sh.att * sa.def * 1.15;
    const awayStrength = sa.att * sh.def;

    const lambdaH = homeStrength * 1.35;
    const lambdaA = awayStrength * 1.05;

    let seed = home.split('').reduce((a, b) => a + b.charCodeAt(0), 0) +
        away.split('').reduce((a, b) => a + b.charCodeAt(0), 0);

    const seededRandom = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };

    const getPoisson = (lambda) => {
        let L = Math.exp(-lambda);
        let p = 1.0;
        let k = 0;
        do {
            k++;
            p *= seededRandom();
        } while (p > L);
        return k - 1;
    };

    const ITERATIONS = 1000;
    const scoreCounts = {};
    for (let i = 0; i < ITERATIONS; i++) {
        const sH = getPoisson(lambdaH);
        const sA = getPoisson(lambdaA);
        const key = `${sH}-${sA}`;
        scoreCounts[key] = (scoreCounts[key] || 0) + 1;
    }

    let bestScore = "0-0";
    let maxCount = 0;
    for (const [score, count] of Object.entries(scoreCounts)) {
        if (count > maxCount) {
            maxCount = count;
            bestScore = score;
        }
    }
    return bestScore;
};

// Simulation across many potential match-ups
const teams = ["Toulouse", "Lens", "Monaco", "Lyon", "Nice", "PSG", "Marseille", "Lille"];
const stats = {
    "Toulouse": { att: 0.9, def: 1.1 },
    "Lens": { att: 1.0, def: 0.9 },
    "Monaco": { att: 1.2, def: 1.0 },
    "Lyon": { att: 1.1, def: 1.1 },
    "Nice": { att: 0.8, def: 0.8 },
    "PSG": { att: 1.5, def: 0.7 },
    "Marseille": { att: 1.2, def: 0.9 },
    "Lille": { att: 1.1, def: 0.8 }
};

console.log("Investigating Score Predictions for various match-ups...");
let totalMatches = 0;
let zeroZeroMatches = 0;

for (let i = 0; i < teams.length; i++) {
    for (let j = 0; j < teams.length; j++) {
        if (i === j) continue;
        totalMatches++;
        const score = predictMatchLiveMock(teams[i], teams[j], stats);
        if (score === "0-0") zeroZeroMatches++;
        console.log(`${teams[i]} vs ${teams[j]}: ${score}`);
    }
}

console.log(`\nTotal Match-ups: ${totalMatches}`);
console.log(`Matches predicted as 0-0: ${zeroZeroMatches} (${(zeroZeroMatches / totalMatches * 100).toFixed(1)}%)`);
