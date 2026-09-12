// Haalt je sessies uit Garmin in plaats van ze te laten typen, en zet de wind erbij die KNMI toen mat.
//   node sessie-garmin.mjs              kijk wat er te halen valt, schrijf niets
//   node sessie-garmin.mjs --schrijf    zet ze in de tabel
//   node sessie.mjs --lijst             wat er nu in staat
//
// Waarom dit kan: op dezelfde VPS draait fithub al een Garmin-koppeling, en die schrijft elke
// activiteit in /home/ubuntu/context/db/personal.sqlite. Garmin WEET dat het kiten was: in
// `activity_metrics` staat de sport, en in `workout` staat het in de titel ("The Hague
// Kiteboarding"). Raden hoeft dus niet, en dat scheelt de bevestigingsstap bijna helemaal.
//
// Eerder stond hier een gok op "buiten, lang genoeg, en er stond wind". Die haalde tennis en een
// sportschoolles binnen als kitesessie, want die duren ook een uur en het waaide die dag ook.
// Raad nooit iets wat de bron gewoon weet.
//
// Twee sportnamen, allebei kiten: `wind_kite_surfing` (2020 tot 2021) en `kiteboarding_v2`
// (2021 tot nu). Dat ziet eruit als een hernoeming door Garmin, niet als twee disciplines, maar
// ze lopen in 2021 en 2022 door elkaar heen. We bewaren de naam zoals hij is en verzinnen er
// GEEN twintip of directional bij; dat is een ding dat Daniel een keer mag zeggen.
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
// De twee namen die Garmin voor kiten gebruikt, plus de titelvorm voor de rijen die nog geen
// metrics-regel hebben (de nieuwste sessies lopen daarin achter).
const SPORTEN = ["wind_kite_surfing", "kiteboarding_v2"];
// Een enkele sessie staat met een onmogelijke duur in Garmin (het horloge bleef doorlopen; er
// staat er een van 2865 minuten in). Voor het windvenster kappen we af, anders middelen we twee
// dagen weer en wind door elkaar.
const MAX_VENSTER_MIN = 360;
// Alleen sessies die Daniel zich kan herinneren. Garmin heeft er 46 vanaf oktober 2020, maar bij
// een sessie van vijf jaar terug weet niemand nog welke kite eraan hing of hoe het reed, en zonder
// dat oordeel voegt de rij niets toe aan de ijking (12-09, zijn eigen keuze).
const VANAF = "2026-01-01";

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
// Alleen wat Garmin echt heeft OPGENOMEN, dus source = 'garmin'. De rijen uit de agenda
// (source notion, program, recurring) staan er ook in, altijd op een rond uur als 18:00 en
// altijd 90 minuten: dat is een plan, geen sessie. Nemen we die mee, dan komen er dubbele
// sessies in de tabel (09-09 stond er twee keer: 18:00 uit de agenda, 18:03 uit het horloge).
const uitMetrics = bron.prepare(
  `select m.activity_date as date, m.sport, round(m.duration_s/60) as duration_min,
          m.distance_m, m.elevation_gain_m, m.garmin_activity_id, w.time, w.title
     from activity_metrics m left join workout w on w.garmin_activity_id = m.garmin_activity_id
    where m.sport in (${SPORTEN.map(() => "?").join(",")}) and m.activity_date >= ?`).all(...SPORTEN, VANAF);
// De nieuwste sessies hebben nog geen metrics-regel, maar staan wel in workout met "Kiteboarding"
// in de titel. Zonder deze tweede greep mis je precies de sessies waar de ijking op staat.
const uitTitel = bron.prepare(
  `select date, time, title, duration_min, distance_m, garmin_activity_id, null as sport, null as elevation_gain_m
     from workout where source = 'garmin' and lower(title) like '%kite%'`).all();
const gezien = new Set(uitMetrics.map(r => r.garmin_activity_id));
const rijen = uitMetrics.concat(uitTitel.filter(r => !gezien.has(r.garmin_activity_id)))
  .sort((a, b) => String(a.date).localeCompare(String(b.date)));

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
// Sleutel op datum en begintijd, NIET op het Garmin-nummer: dat is voor deze rijen leeg, en dan
// overschreef een tweede ronde alles wat je net bevestigd had. Wat je een keer beoordeeld hebt
// (ja of nee) blijft staan, want dat oordeel kan geen enkele import terughalen.
const alBeoordeeld = new Set(uit.prepare("select datum, van from sessie where bevestigd = 1").all().map(r => r.datum + " " + r.van));

console.log(`${rijen.length} activiteiten van ${MIN_MINUTEN} minuten of langer bekeken\n`);
console.log("datum        van    duur   wind   vlaag   kandidaat");
let n = 0;
for (const r of rijen) {
  const datum = String(r.date).slice(0, 10);
  const van = String(r.time || "12:00").slice(0, 5);
  const venster = Math.min(r.duration_min || 60, MAX_VENSTER_MIN);
  const [kn, vlaag] = await windBij(datum, van, venster);
  n++;
  const alGedaan = alBeoordeeld.has(datum + " " + van);
  console.log(`${datum}   ${van}  ${String(r.duration_min).padStart(4)}m  ${(kn == null ? "-" : kn.toFixed(1)).padStart(5)}  ${(vlaag == null ? "-" : vlaag.toFixed(1)).padStart(6)}   ${r.sport || "uit titel"}${alGedaan ? "  (al beoordeeld, blijft staan)" : ""}`);
  if (SCHRIJF && !alGedaan) {
    const eind = new Date(new Date(`${datum}T${van}:00Z`).getTime() + venster * 60000).toISOString().slice(11, 16);
    // Garmin zegt dat het kiten was, dus dit hoeft niet meer bevestigd te worden: bevestigd = 1.
    // Wat nog ontbreekt is de kitemaat en het board, en dat weet alleen Daniel.
    zet.run(datum, van, eind, "kijkduin", null, null, 85, kn, vlaag, null,
      `uit Garmin, ${r.sport || "titel"}${r.title ? ", " + r.title : ""}` +
      (r.elevation_gain_m ? `, ${Math.round(r.elevation_gain_m)} hoogtemeters` : ""),
      "garmin", 1, r.garmin_activity_id, r.duration_min);
  }
}
console.log(`\n${n} kitesessies volgens Garmin zelf`);
if (!SCHRIJF) console.log("Niets geschreven. Draai met --schrijf om ze in de tabel te zetten.");
else console.log(`In de tabel staan nu ${uit.prepare("select count(*) c from sessie").get().c} sessies.\n` +
  `Wat nog ontbreekt is de kitemaat en het board; dat weet Garmin niet.`);
