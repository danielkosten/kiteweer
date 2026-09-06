/* Haalt de uur-data live uit Open-Meteo (gratis, geen sleutel, vanuit de browser).
   Lukt dat niet, dan valt hij terug op uur.js, de laatst gebundelde versie. Zelfde vorm als gen-uur.mjs. */
(function () {
  "use strict";
  var SPOTS = [
    { id: "zandmotor", lat: 52.052, lon: 4.185 },
    { id: "kijkduin", lat: 52.0581, lon: 4.1983 },
    { id: "wassenaar", lat: 52.1648, lon: 4.3491 },
    { id: "noordpier", lat: 52.493, lon: 4.593 }
  ];
  // klasse + gewicht = Arthurs gemeten skill (windcalendar SPEC.md §13); klassen wegen 50/50 in de AJK-mix
  var MODELLEN = [
    { id: "knmi_harmonie_arome_netherlands", naam: "KNMI Harmonie 2 km", dagen: 2.5, arthur: true, klasse: "regionaal", w: 0.88 },
    { id: "meteofrance_arome_france_hd", naam: "AROME-HD 1,3 km", dagen: 2, arthur: true, klasse: "regionaal", w: 1.16 },
    { id: "icon_d2", naam: "ICON-D2 2 km", dagen: 2, arthur: true, klasse: "regionaal", w: 1.03 },
    { id: "ukmo_uk_deterministic_2km", naam: "UKV 2 km", dagen: 2, arthur: true, klasse: "regionaal", w: 0.93 },
    { id: "ecmwf_ifs025", naam: "ECMWF 25 km", dagen: 7, arthur: true, klasse: "globaal", w: 1 },
    { id: "gfs_seamless", naam: "GFS 13 km", dagen: 7, arthur: true, klasse: "globaal", w: 1 },
    { id: "icon_seamless", naam: "ICON 7 km", dagen: 7, arthur: true, klasse: "globaal", w: 1 },
    { id: "meteofrance_seamless", naam: "ARPEGE 10 km", dagen: 4, arthur: false, klasse: "globaal", w: 1 }
  ];
  var r1 = function (x) { return x == null ? null : Math.round(x * 10) / 10; };

  function haal(url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }

  function spot(s) {
    var basis = "latitude=" + s.lat + "&longitude=" + s.lon + "&forecast_days=7&timezone=Europe/Amsterdam";
    return Promise.all([
      haal("https://api.open-meteo.com/v1/forecast?" + basis + "&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m,weather_code,temperature_2m,precipitation&daily=sunrise,sunset&wind_speed_unit=kn&models=knmi_seamless"),
      haal("https://marine-api.open-meteo.com/v1/marine?" + basis + "&hourly=wave_height,wave_period,wave_direction,wind_wave_height,wind_wave_period,swell_wave_height,swell_wave_period,swell_wave_direction"),
      haal("https://api.open-meteo.com/v1/forecast?" + basis + "&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m&wind_speed_unit=kn&models=" + MODELLEN.map(function (m) { return m.id; }).join(","))
    ]).then(function (res) {
      var j = res[0].hourly, m = res[1].hourly, mw = res[2].hourly, per = {};
      MODELLEN.forEach(function (mo) {
        var k = mo.id, ws = mw["wind_speed_10m_" + k] || mw.wind_speed_10m, gs = mw["wind_gusts_10m_" + k] || mw.wind_gusts_10m, ds = mw["wind_direction_10m_" + k] || mw.wind_direction_10m;
        per[k] = j.time.map(function (t) { var i = mw.time.indexOf(t); return i < 0 || ws[i] == null ? null : [Math.round(ws[i]), Math.round(gs[i]), Math.round(ds[i])]; });
      });
      return { lat: s.lat, lon: s.lon, modellen: per,
        uren: j.time.map(function (t, i) { return { t: t, kn: Math.round(j.wind_speed_10m[i]), vl: Math.round(j.wind_gusts_10m[i]), dir: Math.round(j.wind_direction_10m[i]),
          wx: j.weather_code[i], temp: Math.round(j.temperature_2m[i]), mm: j.precipitation[i],
          golf: m.wave_height[i] == null ? null : { m: m.wave_height[i], s: r1(m.wave_period[i]), dir: Math.round(m.wave_direction[i]),
            chop: m.wind_wave_height[i], chopS: r1(m.wind_wave_period[i]), swell: m.swell_wave_height[i], swellS: r1(m.swell_wave_period[i]), swellDir: Math.round(m.swell_wave_direction[i]) } }; }),
        zon: res[0].daily.time.map(function (d, i) { return { d: d, op: res[0].daily.sunrise[i].slice(11), onder: res[0].daily.sunset[i].slice(11) }; }) };
    });
  }

  function terugval() {
    return new Promise(function (ok) {
      var el = document.createElement("script"); el.src = "uur.js"; el.onload = ok; el.onerror = ok; document.head.appendChild(el);
    }).then(function () { if (window.KWU) window.KWU.live = false; });
  }

  /* Cache 30 minuten in de browser: Open-Meteo is gratis maar telt aanvragen, en 12 per bezoek is genoeg. */
  var CACHE = "kiteweer-uur", VERS = 30 * 60e3;
  function uitCache() { try { var c = JSON.parse(localStorage.getItem(CACHE) || "null"); return c && Date.now() - new Date(c.gegenereerd).getTime() < VERS ? c : null; } catch (e) { return null; } }
  function naarCache(out) { try { localStorage.setItem(CACHE, JSON.stringify(out)); } catch (e) {} }

  var cached = uitCache();
  window.KWU_READY = cached ? Promise.resolve(window.KWU = cached) : Promise.all(SPOTS.map(spot)).then(function (alle) {
    var out = { gegenereerd: new Date().toISOString(), bron: "Open-Meteo, live", live: true, modellen: MODELLEN, spots: {} };
    SPOTS.forEach(function (s, i) { out.spots[s.id] = alle[i]; });
    naarCache(out); window.KWU = out;
  }).catch(function (e) { console.warn("live data mislukt, terugval op uur.js", e); return terugval(); });
})();
