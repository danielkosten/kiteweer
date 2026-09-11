// Haalt op wat de meetstations van Rijkswaterstaat vandaag ECHT gemeten hebben en schrijft meting.js.
// Draait elk kwartier via .github/workflows/meting.yml.
//   node gen-meting.mjs
//
// Waarom: het model zit er geregeld 3 tot 5 kn naast, en welke kant het op zit weet je pas als je
// het vergelijkt met een echte meter. Zie je dat het station vanochtend 3 kn boven de voorspelling
// zat, dan mag je dat er vanmiddag ook bij optellen. Dat is precies de reden dat de DAJK-mix bestaat
// (docs/dajk-mix.md).
//
// Bron: dezelfde openbare MATROOS-deur als de stroming, andere database.
//   db=series, source=observed, unit=wind_speed (m/s) en wind_direction (graden waarvandaan).
// Stations en hun ligging komen uit get_available.php; welk station bij welke spot hoort rekent dit
// script zelf uit: het dichtstbijzijnde, met de afstand erbij zodat de pagina hem kan tonen.
// Dat mag hier wel, anders dan bij de stroming: wind over een strand lijkt op wind 5 km verderop,
// terwijl stroom in een geul totaal anders loopt dan in de geul ernaast.

const BASIS = "https://noos.matroos.rws.nl/direct/get_series.php";
const CATALOGUS = "https://noos.matroos.rws.nl/direct/get_available.php?source=observed&unit=wind_speed";
const MS_NAAR_KN = 1.94384;
const MISSING = 1e6;
const GEEN_TIJD = "0000-00-00";
const MAX_KM = 40;          // verder weg dan dit zegt niets meer over jouw strand
const UREN_TERUG = 18;      // genoeg om de hele dag tot nu te dekken, ook 's avonds laat

const { readFileSync, writeFileSync, existsSync } = await import("node:fs");

function stempel(d) { return d.toISOString().slice(0, 16).replace(/[-T:]/g, ""); }

function afstandKm(la1, lo1, la2, lo2) {
  const R = 6371, r = Math.PI / 180;
  const a = Math.sin((la2 - la1) * r / 2) ** 2 +
    Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin((lo2 - lo1) * r / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function haal(u) {
  let laatste;
  for (let p = 0; p < 4; p++) {
    if (p) await new Promise(function (k) { setTimeout(k, 2000 * p); });
    try {
      const r = await fetch(u, { signal: AbortSignal.timeout(30000) });
      const tekst = await r.text();
      if (r.status === 404 || tekst.indexOf("not available") > 0) throw Object.assign(new Error("bestaat niet"), { hard: true });
      if (!r.ok) throw new Error("http " + r.status);
      return tekst;
    } catch (e) { laatste = e; if (e.hard) break; }
  }
  throw new Error(laatste.message);
}

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

function url(loc, unit, van, tot) {
  const q = new URLSearchParams({
    db: "series", loc, source: "observed", unit,
    tstart: stempel(van), tstop: stempel(tot),
    format: "dd_2.0.0", format_date_time: "iso",
  });
  return BASIS + "?" + q;
}

/* Eén station: snelheid en richting los ophalen en per UUR samenvoegen. De meter tikt elke 10
   minuten; de tabel op de pagina is per uur, dus we nemen per uur de meting die het dichtst bij
   het hele uur ligt. Geen gemiddelde: een vlaag of een bui mag het uur niet gladstrijken. */
async function station(code, van, tot) {
  const [sp, di] = await Promise.all([
    haal(url(code, "wind_speed", van, tot)),
    haal(url(code, "wind_direction", van, tot)),
  ]);
  const snelheid = lees(sp), richting = lees(di);
  if (!snelheid.size) return null;
  const perUur = new Map();
  for (const t of snelheid.keys()) {
    const d = new Date(t), uur = new Date(Math.round(d.getTime() / 3600e3) * 3600e3);
    const afwijking = Math.abs(d.getTime() - uur.getTime());
    const sleutel = uur.toISOString().slice(0, 13);
    const staand = perUur.get(sleutel);
    if (!staand || afwijking < staand.afwijking) {
      perUur.set(sleutel, {
        afwijking,
        rij: [uur.toISOString().slice(0, 16) + "Z",
              Math.round(snelheid.get(t) * MS_NAAR_KN * 10) / 10,
              richting.has(t) ? Math.round(richting.get(t)) : null],
      });
    }
  }
  return [...perUur.keys()].sort().map(function (k) { return perUur.get(k).rij; });
}

// --- welk station hoort bij welke spot ---
const kw = JSON.parse(readFileSync(new URL("./data.js", import.meta.url), "utf8").split("=").slice(1).join("=").trim().replace(/;\s*$/, ""));
const cat = JSON.parse(await haal(CATALOGUS)).features.map(function (f) {
  return { code: f.loc_id, naam: f.properties.label, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] };
});
console.error(cat.length + " meetstations in de catalogus");

/* Per spot de drie dichtstbijzijnde stations, op afstand gesorteerd. Drie en niet één, omdat een
   station stil kan liggen: dan schuift de spot door naar de volgende die wel meet. Welke dat werd
   beslissen we pas NA het ophalen, hieronder. */
const kandidaten = {}, nodig = new Set();
for (const s of kw.spots) {
  const lijst = cat
    .map(function (c) { return { code: c.code, km: Math.round(afstandKm(s.lat, s.lon, c.lat, c.lon) * 10) / 10 }; })
    .filter(function (x) { return x.km <= MAX_KM; })
    .sort(function (a, b) { return a.km - b.km; })
    .slice(0, 3);
  if (lijst.length) { kandidaten[s.id] = lijst; lijst.forEach(function (x) { nodig.add(x.code); }); }
}
console.error(nodig.size + " stations te proberen voor " + Object.keys(kandidaten).length + " van de " + kw.spots.length + " spots");

// --- ophalen ---
const nu = new Date();
const van = new Date(nu.getTime() - UREN_TERUG * 3600e3);
const stations = {};
let mislukt = 0;
for (const code of [...nodig].sort()) {
  const c = cat.find(function (x) { return x.code === code; });
  try {
    const uren = await station(code, van, nu);
    if (uren && uren.length) { stations[code] = { naam: c.naam, lat: c.lat, lon: c.lon, uren }; }
    else { mislukt++; console.error(code + ": leeg"); }
  } catch (e) { mislukt++; console.error(code + ": " + e.message); }
}

if (!Object.keys(stations).length) { console.error("geen enkel station gelukt, meting.js niet geschreven"); process.exit(1); }

// Een station dat nu niet antwoordde houdt zijn vorige reeks; oude uren blijven geldig, het is
// een meting van wat er geweest is.
const pad = new URL("./meting.js", import.meta.url);
let gehouden = 0;
if (existsSync(pad)) {
  try {
    const oud = JSON.parse(readFileSync(pad, "utf8").replace(/^window\.KWM = /, "").trim().replace(/;$/, ""));
    for (const code of nodig) {
      if (stations[code]) continue;
      const o = oud.stations?.[code];
      const uren = (o?.uren ?? []).filter(function (r) { return new Date(r[0]).getTime() >= van.getTime(); });
      if (uren.length) { stations[code] = { naam: o.naam, lat: o.lat, lon: o.lon, uren, oud: true }; gehouden++; }
    }
  } catch (e) { console.error("oude meting.js onleesbaar: " + e.message); }
}

/* Nu pas: elke spot krijgt het dichtstbijzijnde station dat vandaag ook echt gemeten heeft. */
const bijSpot = {};
for (const id of Object.keys(kandidaten)) {
  const k = kandidaten[id].find(function (x) { return stations[x.code]; });
  if (k) bijSpot[id] = { station: k.code, km: k.km };
}
console.error(Object.keys(bijSpot).length + " van de " + kw.spots.length + " spots hebben een meetstation");

writeFileSync(pad, "window.KWM = " + JSON.stringify({
  gegenereerd: new Date().toISOString(),
  bron: "Rijkswaterstaat MATROOS, waargenomen wind op 10 m",
  spots: bijSpot,      // spot -> { station, km }
  stations,            // code -> { naam, lat, lon, uren: [[uur UTC, kn, graden waarvandaan]] }
}) + ";\n");
console.error("meting.js geschreven: " + Object.keys(stations).length + " van " + nodig.size + " stations, " +
  mislukt + " mislukt, " + gehouden + " op de oude reeks gehouden");
