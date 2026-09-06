// Haalt per spot 7 dagen uur-voor-uur wind op (Open-Meteo, gratis, geen sleutel)
// en schrijft uur.js. Eerste 2,5 dag = KNMI Harmonie (fijn regionaal), daarna ECMWF.
//   node gen-uur.mjs
const SPOTS = [
  { id: "zandmotor", lat: 52.052, lon: 4.185 },
  { id: "wassenaar", lat: 52.1648, lon: 4.3491 },
  { id: "noordpier", lat: 52.493, lon: 4.593 },
  { id: "kijkduin", lat: 52.0581, lon: 4.1983 },
];
// Windmodellen, elk apart, zodat de pagina zelf kan mixen. Horizon in dagen erbij.
const MODELLEN = [
  // klasse + gewicht = Arthurs gemeten skill (windcalendar SPEC.md §13): regionaal AROME 1,16 · ICON-D2 1,03 ·
  // UKMO 0,93 · KNMI 0,88, globaal 1,0; de twee klassen wegen 50/50.
  { id: "knmi_harmonie_arome_netherlands", naam: "KNMI Harmonie 2 km", dagen: 2.5, arthur: true, klasse: "regionaal", w: 0.88, tijd: true },
  { id: "meteofrance_arome_france_hd", naam: "AROME-HD 1,3 km", dagen: 2, arthur: true, klasse: "regionaal", w: 1.16, tijd: true },
  { id: "icon_d2", naam: "ICON-D2 2 km", dagen: 2, arthur: true, klasse: "regionaal", w: 1.03, tijd: true },
  { id: "ukmo_uk_deterministic_2km", naam: "UKV 2 km", dagen: 2, arthur: true, klasse: "regionaal", w: 0.93, tijd: true },
  { id: "ecmwf_ifs", naam: "ECMWF 9 km", dagen: 7, arthur: true, klasse: "globaal", w: 1, tijd: true, off: true },   // volle 9 km HRES, gratis sinds okt 2025; de 25 km-versie zat 5,5 kn te laag (toets-horizon.mjs)
  { id: "gfs_seamless", naam: "GFS 13 km", dagen: 7, arthur: true, klasse: "globaal", w: 1, tijd: true, off: true },
  { id: "icon_seamless", naam: "ICON 7 km", dagen: 7, arthur: true, klasse: "globaal", w: 1, tijd: true, off: true },
  { id: "meteofrance_seamless", naam: "ARPEGE 5 km", dagen: 4, arthur: false, tijd: true, klasse: "globaal", w: 1 },
    // opt-in: op 60 dagen HvH de trefzekerste 7-daagse modellen op dag 3–7 (JMA fout 3,4–4,7 kn, GEM 4,0–4,8; GFS 4,2–5,3, ECMWF 9 km 4,7–5,5)
    { id: "jma_seamless", naam: "JMA 10 km", dagen: 7, arthur: false, klasse: "globaal", w: 1, tijd: true, off: true },
    { id: "gem_global", naam: "GEM 15 km", dagen: 7, arthur: false, klasse: "globaal", w: 1, tijd: true, off: true },
];
const out = { gegenereerd: new Date().toISOString(), bron: "Open-Meteo, per model", modellen: MODELLEN, spots: {} };
for (const s of SPOTS) {
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${s.lat}&longitude=${s.lon}` +
    `&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m,weather_code,temperature_2m,precipitation` +
    `&daily=sunrise,sunset&wind_speed_unit=kn&models=knmi_seamless&forecast_days=7&timezone=Europe/Amsterdam`;
  const r = await (await fetch(u)).json(), j = r.hourly;
  // golven: aparte gratis marine-api (hoogte, periode, richting)
  const m = (await (await fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${s.lat}&longitude=${s.lon}` +
    `&hourly=wave_height,wave_period,wave_direction,wind_wave_height,wind_wave_period,swell_wave_height,swell_wave_period,swell_wave_direction&forecast_days=7&timezone=Europe/Amsterdam`)).json()).hourly;
  // per model wind/vlagen/richting; ontbrekende uren (voorbij de horizon) worden null
  const mw = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${s.lat}&longitude=${s.lon}` +
    `&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m&wind_speed_unit=kn&forecast_days=7&timezone=Europe/Amsterdam` +
    `&models=${MODELLEN.map(m => m.id).join(",")}`)).json();
  const per = {};
  for (const mo of MODELLEN) {
    const k = mo.id, h = mw.hourly;
    const ws = h["wind_speed_10m_" + k] || h.wind_speed_10m, gs = h["wind_gusts_10m_" + k] || h.wind_gusts_10m, ds = h["wind_direction_10m_" + k] || h.wind_direction_10m;
    per[k] = j.time.map((t, i) => { const ii = mw.hourly.time.indexOf(t);
      return ii < 0 || ws[ii] == null ? null : [Math.round(ws[ii]), Math.round(gs[ii]), Math.round(ds[ii])]; });
  }
  out.spots[s.id] = {
    lat: s.lat, lon: s.lon, modellen: per,
    uren: j.time.map((t, i) => ({
      t, kn: Math.round(j.wind_speed_10m[i]), vl: Math.round(j.wind_gusts_10m[i]),
      dir: Math.round(j.wind_direction_10m[i]), wx: j.weather_code[i], temp: Math.round(j.temperature_2m[i]), mm: j.precipitation[i],
      golf: m.wave_height[i] == null ? null : { m: m.wave_height[i], s: Math.round(m.wave_period[i]*10)/10, dir: Math.round(m.wave_direction[i]),
        chop: m.wind_wave_height[i], chopS: Math.round(m.wind_wave_period[i]*10)/10, swell: m.swell_wave_height[i], swellS: Math.round(m.swell_wave_period[i]*10)/10, swellDir: Math.round(m.swell_wave_direction[i]) },
    })),
    zon: r.daily.time.map((d, i) => ({ d, op: r.daily.sunrise[i].slice(11), onder: r.daily.sunset[i].slice(11) })),
  };
  console.log(s.id, out.spots[s.id].uren.length, "uren");
}
await (await import("node:fs/promises")).writeFile("uur.js", "window.KWU = " + JSON.stringify(out) + ";\n");
