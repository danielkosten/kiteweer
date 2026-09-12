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
const ONDER   = pak("ondergrens-druk", /DRUK_GOED = ([\d.]+)/);
const PERFECT = pak("perfect-druk", /DRUK_PERFECT = ([\d.]+)/);
const FACTOR  = pak("kitefactor", /var KITEFACTOR = ([\d.]+)/);
const KLEINER_D = pak("directional maten kleiner", /KLEINER = \{ twintip:0, directional:([\d.]+) \}/);
const VLAGERIG = pak("vlagerig", /var VLAGERIG = ([\d.]+)/);
const STABIEL  = pak("stabiel", /STABIEL = ([\d.]+)/);

// Zelfde formules als de pagina.
const ideaal = (kn, kg = 85, kleiner = 0) => Math.max(3, FACTOR * kg / kn - kleiner);
const knBij = (druk, kg = 85, kleiner = 0, groot = GROOT) => Math.round(FACTOR * kg / (groot / druk + kleiner));

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
const met9 = knBij(ONDER, 85, 0, 9), met17 = knBij(ONDER, 85, 0, 17);
const beweegt = met9 > knBij(ONDER) && met17 < knBij(ONDER);
if (!beweegt) stuk++;
console.log("  " + (beweegt ? "goed" : "FOUT") + "  ondergrens beweegt mee met de kitemaat    9 m: " + met9 + " kn, 17 m: " + met17 + " kn");

// Het startcijfer moet met de druk meelopen en pieken waar Daniel lekker staat: 20 tot 30 kn bij
// 85 kg met een 13 m. Daarboven kan het nog, maar dan beslissen de omstandigheden, niet de wind.
const drukVan = (kn, kg = 85, kleiner = 0, groot = GROOT) => groot / ideaal(kn, kg, kleiner);
const mC = app.match(/var CURVE = (\[\[[^;]+\]\]);/);
if (!mC) { console.error("FOUT: CURVE niet gevonden in app.js"); process.exit(1); }
const CURVE = JSON.parse(mC[1].replace(/DRUK_GOED/g, String(ONDER)));
const startBij = (kn, kleiner = 0) => {
  const r = drukVan(kn, 85, kleiner);
  if (r <= CURVE[0][0]) return CURVE[0][1];
  for (let i = 1; i < CURVE.length; i++) {
    if (r <= CURVE[i][0]) { const a = CURVE[i-1], b = CURVE[i]; return a[1] + (b[1]-a[1]) * (r-a[0]) / (b[0]-a[0]); }
  }
  return 5;
};
console.log("\nstartcijfer van een sessie (85 kg, 13 m), voor de optelposten:");
// [wind, minimaal, maximaal, waarom]
for (const [kn, lo, hi, waarom] of [
  [12, 1, 4.5, "te weinig wind"],
  [14, 4, 5.5, "kite trekt net"],
  [18, 6.5, 7.8, "prettig"],
  [20, 7.7, 8.5, "onderkant van zijn band"],
  [25, 8.6, 9.0, "midden in zijn band"],
  [30, 8.6, 9.0, "bovenkant van zijn band"],
  [35, 6.0, 7.6, "hard, omstandigheden beslissen"],
  [42, 4.5, 6.0, "te hard"],
]) {
  const echt = Math.round(startBij(kn) * 10) / 10, ok = echt >= lo && echt <= hi;
  if (!ok) stuk++;
  console.log("  " + (ok ? "goed" : "FOUT") + "  " + (kn + " kn, " + waarom).padEnd(40) + echt + " (hoort " + lo + "\u2013" + hi + ")");
}
// De curve mag nooit dalen binnen zijn band: 25 kn hoort niet lager te zijn dan 20 kn.
const stijgt = startBij(25) >= startBij(20) && startBij(20) > startBij(16);
if (!stijgt) stuk++;
console.log("  " + (stijgt ? "goed" : "FOUT") + "  cijfer stijgt naar zijn band toe".padEnd(46) + [16,20,25].map(k => Math.round(startBij(k)*10)/10).join(" \u2192 "));

// Hard waaien mag geen punten kosten: 33 kn hoort hoger uit te komen dan 16 kn.
// Hierop ging het mis: de pagina koos de beste dag op het label ("goed" sloeg "hard"), niet op het cijfer.
const hard = startBij(33), zacht = startBij(16);
const hardWint = hard > zacht;
if (!hardWint) stuk++;
console.log("\n" + (hardWint ? "goed" : "FOUT") + "  hard waait hoger dan halve wind".padEnd(46)
  + "33 kn: " + Math.round(hard*10)/10 + " tegen 16 kn: " + Math.round(zacht*10)/10);

// Een 10 moet bestaan, maar alleen als er meer goed staat dan de wind alleen.
// Top van de curve 9, plus rustige wind (0,5), stroom tegen (0,5) en vier uur of langer (0,5).
const top = Math.max(...CURVE.map(c => c[1]));
const tienKan = top + 0.5 + 0.5 + 0.5 >= 10 && top < 10;
if (!tienKan) stuk++;
console.log((tienKan ? "goed" : "FOUT") + "  een 10 is haalbaar maar niet gratis".padEnd(46)
  + "top van de curve " + top + ", met de bonussen " + (top + 1.5));

// ── De echte sessies ─────────────────────────────────────────────────────────
// Dit is de enige harde grond onder de hele pagina: drie sessies die Daniel zelf heeft gereden,
// met de wind en de vlagen zoals KNMI Hoek van Holland ze die dag mat. Elke drempel hier moet
// ze goed beoordelen. Ging het mis op: bij een vlaaggrens van 1,6 kreeg 30-08 straf voor
// vlagerigheid, terwijl dat zijn beste dag was, met sprongen van 10 m.
const SESSIES = [
  { dag:"zo 30-08", kn:19, vlaag:31, maat:10, kleiner:0, gevoel:"well powered" },
  { dag:"ma 31-08", kn:23, vlaag:30, maat:10, kleiner:0, gevoel:"well powered" },
  { dag:"vr 04-09", kn:24, vlaag:30, maat:8,  kleiner:KLEINER_D, gevoel:"nicely powered" },
];
// Dezelfde woorden als de pagina (staat() in app.js).
const staat = (r) => r > 1.35 ? "over" : r > 1.15 ? "lekker powered" : r < 0.80 ? "te klein" : r < 0.90 ? "iets under" : "goed";
console.log("\nde drie sessies die Daniel echt gereden heeft (85 kg):");
for (const S of SESSIES) {
  const r = S.maat / ideaal(S.kn, 85, S.kleiner);
  const hoe = staat(r);
  const vh = S.vlaag / S.kn;
  const gusty = vh >= VLAGERIG;
  const cijf = Math.round(startBij(S.kn, S.kleiner) * 10) / 10;
  // Wat hij reed moet "goed" of "lekker powered" heten, nooit "over" of "te klein".
  const maatOk = hoe === "goed" || hoe === "lekker powered";
  // En een dag die hij zelf goed noemde mag nooit als vlagerig te boek staan.
  const vlaagOk = !gusty;
  // En het kale windcijfer hoort minstens een 7 te zijn: dit waren goede dagen.
  const cijferOk = cijf >= 7;
  if (!maatOk || !vlaagOk || !cijferOk) stuk++;
  console.log("  " + (maatOk && vlaagOk && cijferOk ? "goed" : "FOUT") + "  " + (S.dag + " " + S.kn + " kn, " + S.maat + " m").padEnd(26)
    + "maat: " + hoe.padEnd(15) + "vlagen " + vh.toFixed(2) + "x " + (gusty ? "VLAGERIG" : "rustig").padEnd(9) + " cijfer " + cijf
    + "   (voelde: " + S.gevoel + ")");
}

// knBij() is de omgekeerde som van ideaal(). ideaal() kapt af op 3 m, dus voorbij die grens bestaat
// de gevraagde druk niet meer. Zonder rem gaf de legenda daar een wind die niet klopte met het oordeel.
// Merkbaar bij een lichte rijder op een kleine kite, dus juist bij iemand anders dan Daniel.
const knBijRem = (druk, kg, kleiner, groot) => Math.round(FACTOR * kg / (groot / Math.min(druk, groot / 3) + kleiner));
let heenTerug = 0;
for (const [kg, kleiner, groot] of [[85,0,13], [85,KLEINER_D,13], [45,0,6], [45,KLEINER_D,5], [120,0,15]]) {
  for (const r of [ONDER, PERFECT, 1.8, 2.5]) {
    const kn = knBijRem(r, kg, kleiner, groot);
    const terug = groot / ideaal(kn, kg, kleiner);
    // Of de druk komt er weer uit, of we zitten tegen de afkapgrens aan: iets anders mag niet.
    const ok = Math.abs(terug - r) < 0.08 || r > groot / 3 - 0.01;
    if (!ok) heenTerug++;
  }
}
if (heenTerug) stuk++;
console.log("\n" + (heenTerug ? "FOUT" : "goed") + "  heen en terug rekenen klopt".padEnd(46)
  + "20 combinaties van gewicht, board en kitemaat, " + heenTerug + " mis");

console.log(stuk ? "\nIJKING: " + stuk + " PROBLEMEN" : "\nIJKING: alles goed");
process.exit(stuk ? 1 : 0);
