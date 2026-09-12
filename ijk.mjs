// Toets of de rekengrenzen nog Daniels geijkte waarden opleveren.
//   node ijk.mjs
// Waarom dit bestaat: op 11-09 bewogen de oordelen mee met je kitemaat, maar de grenzen 14 en 19 kn
// stonden nog vast op knopen. Met een 9 m viel alles boven de ondergrens meteen in "perfect".
// Zo'n fout zie je niet in de browser, want de tabel ziet er prima uit. Deze toets vangt hem wel.
import { readFile } from "node:fs/promises";
const app = await readFile("app.js", "utf8");

const pak = (naam, re) => {
  const m = app.match(re);
  if (!m) { console.error("FOUT: " + naam + " niet gevonden in app.js"); process.exit(1); }
  return parseFloat(m[1]);
};
const VEEL    = pak("VEEL", /var VEEL = (\d+)/);
const TEVEEL  = pak("TEVEEL", /TEVEEL = (\d+)/);
// De ijking hangt aan Daniels eigen uitrusting, niet aan de standaardinstelling van de pagina:
// die standaard is 12 m voor nieuwe bezoekers en mag veranderen zonder de ijking te breken.
const GROOT = 13;
const STANDAARD = pak("standaardmaat", /groot:(\d+)/);
const ONDER   = pak("ondergrens-druk", /r < ([\d.]+) \? "weinig"/);
const PERFECT = pak("perfect-druk", /r < ([\d.]+) \? "goed"/);
const FACTOR  = pak("kitefactor", /return ([\d.]+) \* st\.kg/);

// Zelfde formule als de pagina: druk = jouw grootste maat / de ideale maat bij die wind.
const knBij = (druk, kg = 85, board = 1, groot = GROOT) => Math.round(druk * FACTOR * kg * board / groot);

const verwacht = [
  ["ondergrens, je grootste kite trekt", knBij(ONDER), 14],
  ["perfect vanaf", knBij(PERFECT), 19],
  ["boven deze wind: veel wind, kleine kite", VEEL, 30],
  ["boven deze wind telt het als nee", TEVEEL, 40],
];
let stuk = 0;
console.log("ijking bij 85 kg, twintip, " + GROOT + " m grootste kite (Daniels eigen sessies):");
if (STANDAARD < 4 || STANDAARD > 15) { console.error("  FOUT  standaardmaat " + STANDAARD + " m valt buiten de keuzelijst 4 t/m 15"); process.exit(1); }
console.log("  goed  standaardmaat voor nieuwe bezoekers      " + STANDAARD + " m (binnen de lijst 4 t/m 15)");
for (const [wat, echt, hoort] of verwacht) {
  const ok = echt === hoort;
  if (!ok) stuk++;
  console.log("  " + (ok ? "goed" : "FOUT") + "  " + wat.padEnd(40) + echt + " kn (hoort " + hoort + ")");
}
// En de grenzen moeten meebewegen met een andere kite, anders is de schaal weer hard-coded.
const met9 = knBij(ONDER, 85, 1, 9), met17 = knBij(ONDER, 85, 1, 17);
const beweegt = met9 > knBij(ONDER) && met17 < knBij(ONDER);
if (!beweegt) stuk++;
console.log("  " + (beweegt ? "goed" : "FOUT") + "  ondergrens beweegt mee met de kitemaat    9 m: " + met9 + " kn, 17 m: " + met17 + " kn");

// Het startcijfer van een sessie moet met de druk meelopen: net trekken is geen 8.
const drukVan = (kn, kg = 85, board = 1, groot = GROOT) => groot / (2.2 * kg / kn * board);
const grens = (naam, re) => { const m = app.match(re); if (!m) { console.error("FOUT: " + naam + " niet gevonden"); process.exit(1); } return parseFloat(m[1]); };
const G = [grens("net trekt", /rGem < ([\d.]+) \? 5/), grens("vooruit", /rGem < ([\d.]+) \? 6/), grens("prettig", /rGem < ([\d.]+) \? 7/), grens("powered", /rGem < ([\d.]+) \? 8/)];
const startBij = (kn) => { const r = drukVan(kn); return kn > VEEL ? 6 : r < G[0] ? 5 : r < G[1] ? 6 : r < G[2] ? 7 : r < G[3] ? 8 : 7; };
console.log("\nstartcijfer van een sessie (85 kg, 13 m):");
for (const [kn, hoort, waarom] of [[14, 5, "kite trekt net"], [18, 7, "prettig"], [22, 8, "lekker powered"], [33, 6, "te veel wind"]]) {
  const echt = startBij(kn), ok = echt === hoort;
  if (!ok) stuk++;
  console.log("  " + (ok ? "goed" : "FOUT") + "  " + (kn + " kn, " + waarom).padEnd(40) + echt + " (hoort " + hoort + ")");
}
console.log(stuk ? "\nIJKING: " + stuk + " PROBLEMEN" : "\nIJKING: alles goed");
process.exit(stuk ? 1 : 0);
