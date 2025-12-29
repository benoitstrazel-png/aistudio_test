const lineups = require('./src/data/lineups_2025_2026.json');
const playersDBRaw = require('./src/data/real_players.json');
const photos = require('./src/data/player_photos.json');

const norm = (str) => str?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() || "";
const log = (msg) => console.log(msg);

// Handle if playersDB is { "players": [...] } or just [...]
const playersDB = Array.isArray(playersDBRaw) ? playersDBRaw : (playersDBRaw.players || []);

log("--- INSPECTION START ---");

// 1. ANGERS (Sbai)
const angers = photos["Angers Sco"] || [];
const sbai = angers.find(p => norm(p.name).includes("sbai"));
log(`[Angers] Sbai Photo DB: ${sbai ? sbai.name : "MISSING in Angers Sco"}`);
// Check global if missing
if (!sbai) {
    for (let k in photos) {
        let f = photos[k].find(p => norm(p.name).includes("sbai"));
        if (f) log(`[Global] Found Sbai in ${k}: ${f.name}`);
    }
}

// 2. BREST (Lees-Melou)
const plm = playersDB.find(p => norm(p.Player).includes("lees-melou"));
log(`[Brest] PLM in DB: Club=${plm?.Squad}, Name=${plm?.Player}`);

// 3. RENNES (Samba)
let sambaFound = false;
lineups.forEach(m => {
    if (m.teams.home.includes('Rennes') || m.teams.away.includes('Rennes')) {
        const side = m.teams.home.includes('Rennes') ? 'home' : 'away';
        const starters = m.lineups[side + 'Starters'] || [];
        const s = starters.find(n => norm(n).includes("samba"));
        if (s) {
            log(`[Rennes] Samba in Lineup: "${s}"`);
            sambaFound = true;
        }
    }
});
if (!sambaFound) log("[Rennes] No 'Samba' found in Lineups.");

const dbSambas = playersDB.filter(p => norm(p.Player).includes("samba"));
dbSambas.forEach(s => log(`[DB] Samba: ${s.Player} (${s.Squad}) - Pos: ${s.Pos}`));

// 4. TOULOUSE
log(`[Toulouse] Photos Keys matching 'Toulouse': ${Object.keys(photos).filter(k => k.toLowerCase().includes("toulouse"))}`);

log("--- INSPECTION END ---");
