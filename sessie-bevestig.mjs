// Zeg van een sessie die uit Garmin kwam of het echt kiten was, en hoe het reed.
//   node sessie-bevestig.mjs                     laat zien wat er nog op bevestiging wacht
//   node sessie-bevestig.mjs 2026-09-09 ja twintip 10 "lekker powered"
//   node sessie-bevestig.mjs 2026-09-02 nee      was geen kiten, haal maar weg
//
// Dit is het enige wat je met de hand doet, en het is een woord per sessie. De rest (datum, tijd,
// duur, wind, vlaag) stond al in Garmin en bij de meetpaal. Waarom het niet automatisch kan: een
// uur hardlopen bij 20 kn ziet er in de gegevens hetzelfde uit als een uur kiten bij 20 kn.

import { DatabaseSync } from "node:sqlite";
const DB = process.env.KITEWEER_DB || "/opt/kiteweer-log/kiteweer.db";
const db = new DatabaseSync(DB);

const [datum, ja, board, kite, ...rest] = process.argv.slice(2);

if (!datum) {
  const open = db.prepare("select datum, van, duur_min, kn_gemeten, vlaag_gemeten, notitie from sessie where bevestigd = 0 order by datum").all();
  if (!open.length) { console.log("niets meer te bevestigen."); process.exit(0); }
  console.log(`${open.length} sessies wachten op een ja of nee:\n`);
  console.log("datum        van    duur   wind   vlaag");
  for (const r of open) console.log(
    `${r.datum}   ${r.van}  ${String(r.duur_min || "-").padStart(4)}m  ${(r.kn_gemeten ?? 0).toFixed(1).padStart(5)}  ${(r.vlaag_gemeten ?? 0).toFixed(1).padStart(6)}`);
  console.log(`\nja:   node sessie-bevestig.mjs ${open[0].datum} ja twintip 10 "lekker powered"`);
  console.log(`nee:  node sessie-bevestig.mjs ${open[0].datum} nee`);
  process.exit(0);
}

const rij = db.prepare("select * from sessie where datum = ? and bevestigd is not null order by van limit 1").get(datum)
  || db.prepare("select * from sessie where datum = ? order by van limit 1").get(datum);
if (!rij) { console.error("geen sessie op " + datum + ". Lijst: node sessie-bevestig.mjs"); process.exit(1); }

if ((ja || "").toLowerCase().startsWith("n")) {
  db.prepare("delete from sessie where datum = ? and van = ?").run(rij.datum, rij.van);
  console.log(`${datum} weggehaald, was geen kitesessie.`);
} else {
  db.prepare("update sessie set bevestigd = 1, board = ?, kite = ?, oordeel = ? where datum = ? and van = ?")
    .run(board || rij.board, kite ? +kite : rij.kite, rest.join(" ") || rij.oordeel, rij.datum, rij.van);
  console.log(`${datum} bevestigd: ${board || "?"} ${kite || "?"} m, ${rij.kn_gemeten?.toFixed(1)} kn gemeten, "${rest.join(" ")}"`);
}
const n = db.prepare("select count(*) c from sessie where bevestigd = 0").get().c;
console.log(n ? `nog ${n} te gaan.` : "alles bevestigd.");
