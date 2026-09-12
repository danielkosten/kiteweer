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
const GROOT   = pak("grootste kite", /groot:(\d+)/);
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

console.log(stuk ? "\nIJKING: " + stuk + " PROBLEMEN" : "\nIJKING: alles goed");
process.exit(stuk ? 1 : 0);
