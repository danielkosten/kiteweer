// Haalt per spot 7 dagen uur-voor-uur wind op (Open-Meteo, gratis, geen sleutel)
// en schrijft uur.js. Eerste 2,5 dag = KNMI Harmonie (fijn regionaal), daarna ECMWF.
//   node gen-uur.mjs
const SPOTS = [
  { id: "zandmotor", lat: 52.052, lon: 4.185 },
  { id: "wassenaar", lat: 52.1648, lon: 4.3491 },
  { id: "noordpier", lat: 52.493, lon: 4.593 },
  { id: "kijkduin", lat: 52.0581, lon: 4.1983 },
];
const out = { gegenereerd: new Date().toISOString(), bron: "KNMI Harmonie (2,5 dag), daarna ECMWF", spots: {} };
for (const s of SPOTS) {
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${s.lat}&longitude=${s.lon}` +
    `&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m,weather_code,temperature_2m,precipitation` +
    `&daily=sunrise,sunset&wind_speed_unit=kn&models=knmi_seamless&forecast_days=7&timezone=Europe/Amsterdam`;
  const r = await (await fetch(u)).json(), j = r.hourly;
  // golven: aparte gratis marine-api (hoogte, periode, richting)
  const m = (await (await fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${s.lat}&longitude=${s.lon}` +
    `&hourly=wave_height,wave_period,wave_direction,wind_wave_height,wind_wave_period,swell_wave_height,swell_wave_period,swell_wave_direction&forecast_days=7&timezone=Europe/Amsterdam`)).json()).hourly;
  out.spots[s.id] = {
    lat: s.lat, lon: s.lon,
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
