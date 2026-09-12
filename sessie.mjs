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
// Niet MATROOS maar de KNMI-uurgegevens: MATROOS bewaart alleen een kort venster, en een sessie
// zet je vaak pas dagen later in. KNMI reikt jaren terug en is dezelfde bron waar de vier sessies
// in ijk.mjs op geijkt zijn, dus de getallen zijn onderling vergelijkbaar.
// FH = uurgemiddelde wind in 0,1 m/s, FX = hoogste vlaag in dat uur.
const STATION = { kijkduin: 330, noordpier: 225, wijkaanzee: 225 };   // 330 Hoek van Holland, 225 IJmuiden
const st = STATION[spot] || 330;
// KNMI telt `hour` 1..24 in UTC en het uur BEGINT op hour-1. Van/tot geef je in lokale tijd op,
// dus reken om, anders meet je het verkeerde tijdvak en komt er een geloofwaardig maar fout
// getal uit. De zomertijdsprong vragen we aan de tijdzone zelf, nooit een vaste +2: dit script
// wordt ook in de winter gebruikt, en het draait op een VPS die zelf op UTC staat.
function verschilMetUTC(d) {
  const naam = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Amsterdam", timeZoneName: "shortOffset" })
    .formatToParts(new Date(d + "T12:00:00Z")).find(p => p.type === "timeZoneName").value;   // "GMT+2"
  return parseInt(naam.replace("GMT", ""), 10) || 0;
}
const naarUTCuur = (d, hhmm) => +hhmm.slice(0, 2) - verschilMetUTC(d);
let kn = null, vlaag = null;
try {
  const dd = datum.replace(/-/g, "");
  const body = `stns=${st}&start=${dd}01&end=${dd}24&vars=FH:FX&fmt=json`;
  const r = await fetch("https://www.daggegevens.knmi.nl/klimatologie/uurgegevens", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body, signal: AbortSignal.timeout(30000),
  });
  const rijen = await r.json();
  // Welke uren vallen binnen de sessie? Het KNMI-uur `hour` dekt [hour-1, hour) UTC.
  // Let op: de vraag levert ook de VOLGENDE dag mee, dus filter op datum, anders middel je
  // twee dagen door elkaar. Zo kwam 07-09 er eerst uit op 10,7 kn in plaats van 17,5.
  const u0 = van ? naarUTCuur(datum, van) : 0;
  const u1 = tot ? naarUTCuur(datum, tot) : 23;
  const binnen = rijen.filter(x => x.FH != null && String(x.date).slice(0, 10) === datum
    && String(x.station_code) === String(st) && x.hour - 1 >= u0 && x.hour - 1 <= u1);
  if (binnen.length) {
    kn = binnen.reduce((a, x) => a + x.FH, 0) / binnen.length * 0.1 * MS_NAAR_KN;
    const fx = binnen.filter(x => x.FX != null);
    if (fx.length) vlaag = Math.max(...fx.map(x => x.FX)) * 0.1 * MS_NAAR_KN;
  }
} catch (e) { console.log("KNMI niet bereikbaar, sessie gaat er zonder windgetal in:", e.message); }

db.prepare(`insert or replace into sessie
  (datum, van, tot, spot, board, kite, kg, kn_gemeten, vlaag_gemeten, oordeel, notitie)
  values (?,?,?,?,?,?,?,?,?,?,?)`)
  .run(datum, van || null, tot || null, spot || null, board || null, kite ? +kite : null, 85,
    kn, vlaag, oordeel, null);

console.log(`sessie opgeslagen: ${datum} ${van || ""} ${spot || ""}` +
  (kn == null ? " (geen windgetal gevonden)" : `, ${st} mat gemiddeld ${kn.toFixed(1)} kn, hoogste ${vlaag.toFixed(1)} kn`));
console.log(`nu ${db.prepare("select count(*) c from sessie").get().c} sessies in de tabel. Lijst: node sessie.mjs --lijst`);
