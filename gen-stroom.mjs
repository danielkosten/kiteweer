// Haalt de getijstroom per spot op bij Rijkswaterstaat (MATROOS/NOOS, publiek, geen sleutel)
// en schrijft stroom.js. Draait elke nacht via .github/workflows/stroom.yml.
//   node gen-stroom.mjs
//
// Bron en curatie zijn van Arthur (windcalendar SPEC.md §9, src/current.ts, src/feeds.ts):
//   - dezelfde deur: noos.matroos.rws.nl/direct/get_series.php, format dd_2.0.0
//   - dezelfde bron: dcsm_fm05nm_astro, puur astronomisch getij. De windgeforceerde bronnen
//     geven op deze publieke server nul events (zijn #32); die zitten achter een login.
//     Gevolg: de opzet door wind zit er NIET in. De legenda zegt dat.
//   - dezelfde conventie: stroom = graden WAARHEEN, wind = graden WAARVANDAAN.
//   - geen uur-gemiddelde. De ruwe 10-minuten-stap blijft staan, want een kentering
//     binnen het uur middelt anders weg. app.js pakt het dichtstbijzijnde punt.
//
// PUNTEN is Arthurs gecureerde koppeling spot -> RWS-stroompunt (spots.yaml, veld matroos_punt).
// Het dichtstbijzijnde punt is nadrukkelijk niet de regel: buurpunten schelen een factor 9.
// Opnieuw afdrukken uit een verse spots.yaml: zie docs/stroom.md.

const PUNTEN = {
  "zandmotor": "Katwijk", "kijkduin": "Katwijk", "wassenaar": "Katwijk",
  "katwijk-aan-zee": "Katwijk", "langevelderslag": "Katwijk", "noordwijk": "Katwijk",
  "scheveningen": "Katwijk",
  "noordpier": "IJgeul Stroommeetpaal 1", "bloemendaal": "IJgeul Stroommeetpaal 1",
  "castricum": "IJgeul Stroommeetpaal 1", "ijmuiden-kennemerstrand": "IJgeul Stroommeetpaal 1",
  "zandvoort": "IJgeul Stroommeetpaal 1",
  "bergen-aan-zee": "Petten Zuid", "callantsoog": "Petten Zuid", "camperduin": "Petten Zuid",
  "egmond": "Petten Zuid", "petten": "Petten Zuid",
  "hoek-van-holland": "Maasgeul vh stroommeetpaal", "maasvlakte-slufterstrand": "Maasgeul vh stroommeetpaal",
  "oostvoorne-autostrand": "Maasgeul vh stroommeetpaal", "rockanje": "Maasgeul vh stroommeetpaal",
  "texel-paal-17": "Texel Noordzee", "texel-paal-9": "Texel Noordzee", "texel-vuurtoren": "Texel Noordzee",
  "texel-dijkmanshuizen": "Texel Oudeschild",
  "ameland-wad": "Ameland Nes",
  "brouwersdam-noordzee": "Brouwershavensegat 8",
  "cadzand": "Cadzand meetpaal",
  "delfzijl": "Eemsboei 51",
  "den-helder": "Den Helder Marsdiep",
  "domburg": "Passage Kaloo",
  "harlingen": "Harlingen Havenmond",
  "lauwersoog": "Lauwersoog",
  "neeltje-jans": "Oosterschelde Roompotsluis buiten",
  "ouddorp": "Haringvliet meetpaal 10",
  "terschelling-groene-strand": "Terschelling west",
  "terschelling-noordzee": "Terschelling Noordzee",
  "vrouwenpolder": "Oosterschelde 11",
  "westkapelle": "Westkapelle",
};

const BRON = "dcsm_fm05nm_astro";
const BASIS = "https://noos.matroos.rws.nl/direct/get_series.php";
const MS_NAAR_KN = 1.94384;   // MATROOS levert m/s
const MISSING = 1e6;          // alles hierboven is de missing-sentinel van MATROOS
const GEEN_TIJD = "0000-00-00"; // nepdatum bij no-data: geldige JSON, waarde 0, tijdstempel 0000-00-00

function stempel(d) { return d.toISOString().slice(0, 16).replace(/[-T:]/g, ""); }

function url(punt, unit, van, tot) {
  const q = new URLSearchParams({
    db: "maps1d", loc: punt, source: BRON, unit,
    tstart: stempel(van), tstop: stempel(tot), tinc: "10",
    format: "dd_2.0.0", format_date_time: "iso",
  });
  return BASIS + "?" + q;
}

/* Eén reeks uit een dd_2.0.0-antwoord. Bij no-data stuurt MATROOS platte tekst; dan lege lijst. */
function lees(ruw) {
  if (!ruw || ruw.trimStart()[0] !== "{") return new Map();
  let j; try { j = JSON.parse(ruw); } catch { return new Map(); }
  const uit = new Map();
  for (const e of j?.results?.[0]?.events ?? []) {
    if (!e.timeStamp || e.timeStamp.startsWith(GEEN_TIJD) || e.value == null) continue;
    const v = typeof e.value === "string" ? Number(e.value) : e.value;
    if (!Number.isFinite(v) || Math.abs(v) >= MISSING) continue;
    uit.set(e.timeStamp, v);
  }
  return uit;
}

/* RWS knijpt af bij te snel achter elkaar vragen: drie pogingen met oplopende pauze. */
async function haal(u) {
  let laatste;
  for (let p = 0; p < 3; p++) {
    if (p) await new Promise(function (k) { setTimeout(k, 3000 * p); });
    try {
      const r = await fetch(u, { signal: AbortSignal.timeout(45000) });
      const tekst = await r.text();
      // 404 = dit punt bestaat niet op dit rooster. Opnieuw vragen helpt dan nooit.
      if (r.status === 404 || tekst.indexOf("Unavailable location") > 0) throw Object.assign(new Error("punt bestaat niet op dit rooster"), { hard: true });
      if (!r.ok) throw new Error("http " + r.status);
      return tekst;
    } catch (e) { laatste = e; if (e.hard) break; }
  }
  throw new Error(laatste.message);
}

/* Eén punt: snelheid en richting los ophalen (de API geeft één grootheid per call) en samenvoegen. */
async function punt(naam, van, tot) {
  const [sp, di] = await Promise.all([
    haal(url(naam, "water_speed", van, tot)),
    haal(url(naam, "water_direction", van, tot)),
  ]);
  const snelheid = lees(sp), richting = lees(di);
  const rij = [];
  for (const t of [...snelheid.keys()].sort()) {
    const d = richting.get(t);
    if (d == null) continue;
    rij.push([t.slice(0, 16) + "Z", Math.round(snelheid.get(t) * MS_NAAR_KN * 100) / 100, Math.round(d)]);
  }
  // Om en om weggooien: 20 minuten tussen de punten. Een kentering blijft daarmee op 10 minuten
  // nauwkeurig en het bestand halveert. app.js pakt toch het dichtstbijzijnde punt bij het uur.
  const dun = [];
  for (let i = 0; i < rij.length; i += 2) { dun.push(rij[i]);
  }
  return dun;
}

const nu = new Date();
const van = new Date(nu.getTime() - 6 * 3600e3), tot = new Date(nu.getTime() + 8 * 86400e3);
const namen = [...new Set(Object.values(PUNTEN))].sort();
const punten = {};
let mislukt = 0;
for (const naam of namen) {
  try {
    await new Promise(function (k) { setTimeout(k, 1500); });   // rustig aan tegen de RWS-server
    const rij = await punt(naam, van, tot);
    if (rij.length) { punten[naam] = rij; console.error(naam + ": " + rij.length + " punten"); }
    else { mislukt++; console.error(naam + ": LEEG"); }
  } catch (e) { mislukt++; console.error(naam + ": FOUT " + e.message); }
}

if (!Object.keys(punten).length) { console.error("geen enkel punt gelukt, stroom.js niet geschreven"); process.exit(1); }

const uit = {
  gegenereerd: new Date().toISOString(),
  bron: "Rijkswaterstaat MATROOS " + BRON + " (astronomisch getij, zonder windopzet)",
  tot: tot.toISOString(),
  spots: PUNTEN,
  punten,   // punt -> [[tijd UTC, kn, graden waarheen], ...] op de ruwe 10-minuten-stap
};
const { writeFileSync } = await import("node:fs");
writeFileSync(new URL("./stroom.js", import.meta.url), "window.KWS = " + JSON.stringify(uit) + ";\n");
console.error("stroom.js geschreven: " + namen.length + " punten gevraagd, " + mislukt + " mislukt");
