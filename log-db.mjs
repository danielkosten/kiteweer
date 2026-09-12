// Schrijft elke ronde weg wat de modellen zeiden en wat de palen maten, zodat je er later
// patronen in kunt zoeken die je nu nog niet kunt bedenken.
//   node log-db.mjs            (draait op de VPS, na gen-meting.mjs, zie /opt/kiteweer/ververs.sh)
//
// Waarom dit bestaat naast het archief van Open-Meteo:
// het archief bewaart per dag ongeveer een run per model. Wat de pagina op DIT moment liet zien,
// met de verste run van vandaag erin, staat daar niet in. Dat is precies het getal waar Daniel
// naar keek toen hij besloot wel of niet te gaan, en dus het enige getal dat je achteraf niet
// meer kunt terughalen. Alles wat WEL terug te halen is (dag 1 tot 7, elk station, 3,5 jaar)
// haal je uit het archief met toets-lang.mjs; daar hoef je hier niets voor te bewaren.
//
// Waarschuwing die bij dit bestand hoort. Hoe meer kolommen je bewaart, hoe zekerder je later
// een "patroon" vindt dat er niet is. Op 12-09 leek elke combinatie zonder KNMI Harmonie beter
// op Hoek van Holland, en op de twee andere stations was het weg. Zie docs/fijne-bias-lang.md.
// De regel: een vondst telt pas als hij standhoudt op een station of een spot die je NIET
// gebruikt hebt om hem te vinden.

import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync } from "node:fs";

const DB = process.env.KITEWEER_DB || "/opt/kiteweer-log/kiteweer.db";
const REPO = process.env.KITEWEER_REPO || "/opt/kiteweer";
// De spots waarvoor we de voorspelling bewaren. Klein houden: dit groeit elk uur.
const SPOTS = { kijkduin: [52.052, 4.185], noordpier: [52.463, 4.555], wijkaanzee: [52.494, 4.593] };
const MODELLEN = ["knmi_harmonie_arome_netherlands", "meteofrance_arome_france_hd", "icon_d2",
  "ukmo_uk_deterministic_2km", "ecmwf_ifs", "gfs_seamless", "icon_seamless",
  "meteofrance_seamless", "jma_seamless", "gem_global"];
// Elk uur bewaren we alleen het bruikbare venster; een keer per dag de hele horizon.
const UREN_KORT = 12, UREN_LANG = 168, VOL_UUR = 6;

mkdirSync(DB.replace(/\/[^/]+$/, ""), { recursive: true });
const db = new DatabaseSync(DB);
db.exec("pragma journal_mode = wal");
// Een rij per model per uur per ophaalmoment. De sleutel zorgt dat twee runs in hetzelfde uur
// elkaar overschrijven in plaats van de tabel te verdubbelen.
db.exec(`create table if not exists voorspelling (
  opgehaald text not null,        -- uur waarop we het ophaalden, UTC, zoals 2026-09-12T14
  spot      text not null,
  model     text not null,
  uur       text not null,        -- het uur waarover de voorspelling gaat, UTC
  kn        real, vlaag real, richting real,
  primary key (opgehaald, spot, model, uur))`);
db.exec(`create table if not exists meting (
  station text not null, uur text not null,   -- UTC
  kn real, richting real,
  primary key (station, uur))`);
// De echte grond onder de pagina. Vier sessies is te weinig; dit is de tabel die het archief
// je nooit kan geven, want alleen Daniel weet of het lekker was.
db.exec(`create table if not exists sessie (
  datum text not null, van text, tot text, spot text,
  board text, kite real, kg real,
  kn_gemeten real, vlaag_gemeten real,
  oordeel text, notitie text,
  primary key (datum, van, spot))`);
db.exec("create index if not exists i_v_uur on voorspelling(uur, spot, model)");
db.exec("create index if not exists i_m_uur on meting(uur, station)");

const nuUur = new Date().toISOString().slice(0, 13);

// ── 1. de metingen die gen-meting.mjs net geschreven heeft ────────────────────
// Vorm: KWM.stations[x].uren = lijst van [stempelUTC, knopen, richting], geen object.
let nMeting = 0;
try {
  const tekst = readFileSync(REPO + "/meting.js", "utf8");
  const g = { window: {} }; new Function("window", tekst.replace(/^window\./, "window."))(g.window);
  const KWM = g.window.KWM;
  const zet = db.prepare("insert or replace into meting (station, uur, kn, richting) values (?,?,?,?)");
  for (const [naam, st] of Object.entries(KWM.stations || {}))
    for (const [t, kn, dir] of st.uren || []) { zet.run(naam, String(t).slice(0, 13), kn, dir); nMeting++; }
} catch (e) { console.log("meting overslaan:", e.message); }

// ── 2. wat de modellen nu zeggen ──────────────────────────────────────────────
const vol = +nuUur.slice(11, 13) === VOL_UUR;
const uren = vol ? UREN_LANG : UREN_KORT;
let nVoor = 0;
const zetV = db.prepare("insert or replace into voorspelling (opgehaald, spot, model, uur, kn, vlaag, richting) values (?,?,?,?,?,?,?)");
for (const [spot, [lat, lon]] of Object.entries(SPOTS)) {
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m&wind_speed_unit=kn&timezone=UTC` +
    `&forecast_hours=${uren}&models=${MODELLEN.join(",")}`;
  let H;
  try {
    const r = await fetch(u, { signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error("http " + r.status);
    H = (await r.json()).hourly;
  } catch (e) { console.log(spot, "overslaan:", e.message); continue; }
  if (!H) continue;
  for (const m of MODELLEN) {
    const kn = H["wind_speed_10m_" + m], vl = H["wind_gusts_10m_" + m], ri = H["wind_direction_10m_" + m];
    if (!kn) continue;
    for (let i = 0; i < H.time.length; i++) {
      if (kn[i] == null) continue;
      zetV.run(nuUur, spot, m, H.time[i].slice(0, 13), kn[i], vl ? vl[i] : null, ri ? ri[i] : null);
      nVoor++;
    }
  }
}

const tel = n => db.prepare("select count(*) c from " + n).get().c;
console.log(`log-db: ${nMeting} metingen, ${nVoor} voorspellingen weggeschreven${vol ? " (hele horizon)" : ""}`);
console.log(`totaal in de tabel: voorspelling ${tel("voorspelling")}, meting ${tel("meting")}, sessie ${tel("sessie")}`);
