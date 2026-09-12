// Zet een sessie die je echt gereden hebt in de tabel, en haalt er zelf bij wat de paal toen mat.
//   node sessie.mjs 2026-09-12 15:00 18:00 kijkduin twintip 10 "top, lekker powered"
//   node sessie.mjs --lijst
//
// Waarom dit het belangrijkste bestand van de hele meetketen is: de pagina hangt aan VIER
// sessies in ijk.mjs, allemaal augustus en september, allemaal tussen 17 en 24 kn. Onder de 17
// en boven de 24 staat er niets, terwijl de pagina wel grenzen trekt op 30 en 40 kn. Geen enkel
// archief kan dat gat vullen, want alleen jij weet of het lekker was. Tien sessies over een
// winter zijn meer waard dan een jaar model-tegen-paal wegschrijven.

import { DatabaseSync } from "node:sqlite";

const DB = process.env.KITEWEER_DB || "/opt/kiteweer-log/kiteweer.db";
const MS_NAAR_KN = 1.94384;
const MISSING = 1e6;

const db = new DatabaseSync(DB);
db.exec(`create table if not exists sessie (
  datum text not null, van text, tot text, spot text,
  board text, kite real, kg real,
  kn_gemeten real, vlaag_gemeten real,
  oordeel text, notitie text,
  primary key (datum, van, spot))`);

const a = process.argv.slice(2);
if (a[0] === "--lijst" || !a.length) {
  const rijen = db.prepare("select * from sessie order by datum, van").all();
  if (!rijen.length) { console.log("nog geen sessies. Zet er een in met:\n  node sessie.mjs 2026-09-12 15:00 18:00 kijkduin twintip 10 \"top\""); process.exit(0); }
  console.log("datum       van   tot   spot         board      kite  gemeten  vlaag  oordeel");
  for (const r of rijen) console.log(
    `${r.datum}  ${r.van || "-"}  ${r.tot || "-"}  ${(r.spot || "-").padEnd(12)} ${(r.board || "-").padEnd(10)} ${String(r.kite ?? "-").padStart(4)}  ` +
    `${r.kn_gemeten == null ? "   -  " : r.kn_gemeten.toFixed(1).padStart(5) + " "}  ${r.vlaag_gemeten == null ? "  -  " : r.vlaag_gemeten.toFixed(1).padStart(5)}  ${r.oordeel || ""}`);
  process.exit(0);
}

const [datum, van, tot, spot, board, kite, ...rest] = a;
if (!/^\d{4}-\d{2}-\d{2}$/.test(datum || "")) { console.error("eerste veld moet een datum zijn, zoals 2026-09-12"); process.exit(1); }
const oordeel = rest.join(" ") || null;

// Wat mat de paal in dat tijdvak? Zelfde MATROOS-deur als gen-meting.mjs, database series.
// Spot naar meetstation: we vragen het dichtstbijzijnde op via de spotlijst in meting.js is te
// omslachtig hier, dus we gebruiken de vaste koppeling van de drie spots die we loggen.
const STATION = { kijkduin: "hoekvanholland", noordpier: "ijmuiden.buiten", wijkaanzee: "ijmuiden.buiten" };
const st = STATION[spot] || "hoekvanholland";
// Zelfde deur en zelfde vorm als gen-meting.mjs: db=series, antwoord is JSON met results[0].events.
// De tijden gaan in als YYYYMMDDHHMM in UTC; van/tot geef je in lokale tijd, dus twee uur eraf
// in de zomer. Vergeet je dat, dan meet je het verkeerde tijdvak en komt er een geloofwaardig
// maar fout getal uit.
const uurUTC = (d, hhmm, val) => {
  const [H, M] = (hhmm || val).split(":");
  return new Date(`${d}T${H}:${M}:00+02:00`).toISOString().slice(0, 16).replace(/[-T:]/g, "");
};
let kn = null, vlaag = null;
try {
  const q = new URLSearchParams({
    db: "series", loc: st, source: "observed", unit: "wind_speed",
    tstart: uurUTC(datum, van, "00:00"), tstop: uurUTC(datum, tot, "23:59"),
    format: "dd_2.0.0", format_date_time: "iso",
  });
  const r = await fetch("https://noos.matroos.rws.nl/direct/get_series.php?" + q, { signal: AbortSignal.timeout(30000) });
  const j = await r.json();
  const waarden = (j?.results?.[0]?.events ?? [])
    .map(e => typeof e.value === "string" ? Number(e.value) : e.value)
    .filter(v => Number.isFinite(v) && Math.abs(v) < MISSING);
  if (waarden.length) {
    kn = waarden.reduce((x, y) => x + y, 0) / waarden.length * MS_NAAR_KN;
    vlaag = Math.max(...waarden) * MS_NAAR_KN;
  }
} catch (e) { console.log("paal niet bereikbaar, sessie gaat er zonder windgetal in:", e.message); }

db.prepare(`insert or replace into sessie
  (datum, van, tot, spot, board, kite, kg, kn_gemeten, vlaag_gemeten, oordeel, notitie)
  values (?,?,?,?,?,?,?,?,?,?,?)`)
  .run(datum, van || null, tot || null, spot || null, board || null, kite ? +kite : null, 85,
    kn, vlaag, oordeel, null);

console.log(`sessie opgeslagen: ${datum} ${van || ""} ${spot || ""}` +
  (kn == null ? " (geen windgetal gevonden)" : `, ${st} mat gemiddeld ${kn.toFixed(1)} kn, hoogste ${vlaag.toFixed(1)} kn`));
console.log(`nu ${db.prepare("select count(*) c from sessie").get().c} sessies in de tabel. Lijst: node sessie.mjs --lijst`);
