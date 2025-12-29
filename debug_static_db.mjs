import { PLAYERS_DB } from './src/data/players_static.js';

console.log("DB Loaded. Length:", PLAYERS_DB.length);

// 1. Finder Helper
const find = (arr, query) => arr.filter(p => JSON.stringify(p).toLowerCase().includes(query.toLowerCase()));

// 2. Search Sbai
const sba = find(PLAYERS_DB, "sba");
console.log("Sbai search results:", sba.map(p => `${p.Player} (${p.Squad})`));

// 3. Search PLM
const plm = find(PLAYERS_DB, "lees-melou");
console.log("PLM search results:", plm.map(p => `${p.Player} (${p.Squad})`));

// 4. Search Angers
const angers = PLAYERS_DB.filter(p => p.Squad === "Angers");
console.log("Angers Player Count:", angers.length);
console.log("Angers Players:", angers.map(p => p.Player).join(", "));
