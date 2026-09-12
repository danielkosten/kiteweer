// Haalt je sessies uit Garmin in plaats van ze te laten typen, en zet de wind erbij die KNMI toen mat.
//   node sessie-garmin.mjs              kijk wat er te halen valt, schrijf niets
//   node sessie-garmin.mjs --schrijf    zet ze in de tabel
//   node sessie.mjs --lijst             wat er nu in staat
//
// Waarom dit kan: op dezelfde VPS draait fithub al een Garmin-koppeling, en die schrijft elke
// activiteit in /home/ubuntu/context/db/personal.sqlite, tabel `workout`. Kitesessies staan daar
// als type "Other" tussen, want Garmin weet niet beter. Het windgetal van de meetpaal is wat ze
// alsnog uit elkaar houdt: 89 minuten buiten bij 18 kn is geen wandeling.
//
// Nagemeten op 12-09: de vier sessies waarop de hele pagina geijkt is (ijk.mjs) komen er alle vier
// uit, met het juiste windgetal. Garmin-venster tegen wat ijk.mjs zegt:
//   30-08 09:50 +89min -> 18,5 kn (ijk: 19)   31-08 13:05 +130min -> 23,3 kn (ijk: 23)
//   04-09 18:38 +60min -> 25,3 kn (ijk: 24)   07-09 19:08 +79min -> 17,5 kn (ijk: 17)
// En het vond er twee die ijk.mjs niet heeft: 02-09 bij 14,6 kn en 09-09 bij 19,4 kn.
//
// Wat dit NIET doet: beslissen of je echt gekite hebt. Een uur hardlopen bij 20 kn ziet er in deze
// tabel hetzelfde uit. Daarom komt alles binnen als `bevestigd = 0` en zet jij er een keer
// ja of nee bij. Dat is een woord per sessie in plaats van acht velden.

import { DatabaseSync } from "node:sqlite";

const DB = process.env.KITEWEER_DB || "/opt/kiteweer-log/kiteweer.db";
const FITHUB = process.env.FITHUB_DB || "/home/ubuntu/context/db/personal.sqlite";
const SCHRIJF = process.argv.includes("--schrijf");
// Wat een kandidaat is: buiten, lang genoeg, en er stond wind. Ruim nemen; liever een paar te veel
// die je wegstreept dan een sessie missen, want sessies zijn juist het schaarse goed hier.
const MIN_MINUTEN = 30, MIN_KN = 12;
const SOORTEN = ["Other", "Kitesurf", "Windsurf", "Surfing"];

const uit = new DatabaseSync(DB);
uit.exec(`create table if not exists sessie (
  datum text not null, van text, tot text, spot text,
  board text, kite real, kg real,
  kn_gemeten real, vlaag_gemeten real,
  oordeel text, notitie text,
  primary key (datum, van, spot))`);
// Nieuwe kolommen erbij zonder de tabel weg te gooien; een tweede keer draaien mag mislukken.
for (const k of ["bron text", "bevestigd integer", "garmin_id text", "duur_min integer"])
  try { uit.exec("alter table sessie add column " + k); } catch (e) { /* stond er al */ }

const bron = new DatabaseSync(FITHUB);
const rijen = bron.prepare(
  `select date, time, type, title, duration_min, garmin_activity_id
     from workout
    where duration_min >= ? and type in (${SOORTEN.map(() => "?").join(",")})
    order by date`).all(MIN_MINUTEN, ...SOORTEN);

// Lokale tijd naar UTC via de tijdzone zelf, nooit een vaste +2: dit draait ook in de winter,
// en op een VPS die op UTC staat.
const verschil = d => parseInt(new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Amsterdam", timeZoneName: "shortOffset" })
  .formatToParts(new Date(d + "T12:00:00Z")).find(p => p.type === "timeZoneName").value.replace("GMT", ""), 10) || 0;

const knmiCache = new Map();
async function windBij(datum, van, minuten) {
  if (!knmiCache.has(datum)) {
    const dd = datum.replace(/-/g, "");
    const r = await fetch("https://www.daggegevens.knmi.nl/klimatologie/uurgegevens", {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
      body: `stns=330&start=${dd}01&end=${dd}24&vars=FH:FX&fmt=json`, signal: AbortSignal.timeout(30000),
    });
    knmiCache.set(datum, await r.json());
  }
  const j = knmiCache.get(datum);
  // KNMI telt `hour` 1..24 in UTC en het uur BEGINT op hour-1. De vraag levert ook de volgende
  // dag mee, dus filter op datum, anders middel je twee dagen door elkaar.
  const u0 = +van.slice(0, 2) - verschil(datum), u1 = u0 + Math.ceil(minuten / 60) - 1;
  const b = j.filter(x => x.FH != null && String(x.date).slice(0, 10) === datum && x.hour - 1 >= u0 && x.hour - 1 <= u1);
  if (!b.length) return [null, null];
  const fx = b.filter(x => x.FX != null);
  return [b.reduce((a, x) => a + x.FH, 0) / b.length * 0.1 * 1.94384,
    fx.length ? Math.max(...fx.map(x => x.FX)) * 0.1 * 1.94384 : null];
}

const zet = uit.prepare(`insert or replace into sessie
  (datum, van, tot, spot, board, kite, kg, kn_gemeten, vlaag_gemeten, oordeel, notitie, bron, bevestigd, garmin_id, duur_min)
  values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const alBevestigd = new Set(uit.prepare("select garmin_id from sessie where bevestigd is not null and garmin_id is not null").all().map(r => r.garmin_id));

console.log(`${rijen.length} activiteiten van ${MIN_MINUTEN} minuten of langer bekeken\n`);
console.log("datum        van    duur   wind   vlaag   kandidaat");
let n = 0;
for (const r of rijen) {
  const van = String(r.time || "12:00").slice(0, 5);
  const [kn, vlaag] = await windBij(r.date, van, r.duration_min);
  if (kn == null) continue;
  const kandidaat = kn >= MIN_KN;
  if (!kandidaat) continue;
  n++;
  const bevestigd = alBevestigd.has(r.garmin_activity_id) ? null : 0;
  console.log(`${r.date}   ${van}  ${String(r.duration_min).padStart(4)}m  ${kn.toFixed(1).padStart(5)}  ${(vlaag ?? 0).toFixed(1).padStart(6)}   ${r.type}`);
  if (SCHRIJF && bevestigd !== null) {
    const eind = new Date(new Date(`${r.date}T${van}:00Z`).getTime() + r.duration_min * 60000).toISOString().slice(11, 16);
    zet.run(r.date, van, eind, "kijkduin", null, null, 85, kn, vlaag, null,
      `uit Garmin, type ${r.type}${r.title ? ", " + r.title : ""}`, "garmin", 0, r.garmin_activity_id, r.duration_min);
  }
}
console.log(`\n${n} kandidaat-sessies (buiten, ${MIN_MINUTEN} min of langer, wind ${MIN_KN} kn of meer)`);
if (!SCHRIJF) console.log("Niets geschreven. Draai met --schrijf om ze in de tabel te zetten.");
else console.log(`In de tabel staan nu ${uit.prepare("select count(*) c from sessie").get().c} sessies.\n` +
  `Bevestigen doe je zo:  node sessie-bevestig.mjs 2026-09-09 ja twintip 10 "lekker powered"`);
