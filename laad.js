/* Haalt de uur-data live uit Open-Meteo (gratis, geen sleutel, vanuit de browser).
   Lukt dat niet, dan valt hij terug op uur.js, de laatst gebundelde versie. Zelfde vorm als gen-uur.mjs. */
(function () {
  "use strict";
  // spots komen uit data.js (window.KW.spots, met lat/lon); laden gebeurt per spot, pas als je hem kiest
  // klasse + gewicht = Arthurs gemeten skill (windcalendar SPEC.md §13); klassen wegen 50/50 in de AJK-mix
  // klasse + gewicht = Arthurs gemeten skill (windcalendar SPEC.md §13); klassen wegen 50/50 in de AJK-mix.
  // tijd = doet mee in de DAJK-mix; off = krijgt daar de spot-optelling (grof leest 3–4 kn te laag aan het water,
  // ARPEGE niet). Gemeten: toets-horizon.mjs, docs/dajk-mix.md.
  var MODELLEN = [
    { meta: true, id: "knmi_harmonie_arome_netherlands", naam: "KNMI Harmonie 2 km", dagen: 2.5, arthur: true, tijd: true, klasse: "regionaal", w: 0.88 },
    { meta: true, id: "meteofrance_arome_france_hd", naam: "AROME-HD 1,3 km", dagen: 2, arthur: true, tijd: true, klasse: "regionaal", w: 1.16 },
    { id: "icon_d2", naam: "ICON-D2 2 km", dagen: 2, arthur: true, tijd: true, klasse: "regionaal", w: 1.03 },
    { meta: true, id: "ukmo_uk_deterministic_2km", naam: "UKV 2 km", dagen: 2, arthur: true, tijd: true, klasse: "regionaal", w: 0.93 },
    { meta: true, id: "ecmwf_ifs", naam: "ECMWF 9 km", dagen: 7, arthur: true, tijd: true, off: true, klasse: "globaal", w: 1 },   // volle 9 km HRES, gratis sinds okt 2025; de 25 km-versie zat 5,5 kn te laag
    { id: "gfs_seamless", naam: "GFS 13 km", dagen: 7, arthur: true, tijd: true, off: true, klasse: "globaal", w: 1 },
    { id: "icon_seamless", naam: "ICON 7 km", dagen: 7, arthur: true, tijd: true, off: true, klasse: "globaal", w: 1 },
    { id: "meteofrance_seamless", naam: "ARPEGE 5 km", dagen: 4, arthur: false, tijd: true, klasse: "globaal", w: 1 },   // gerekt rooster, ~5 km boven onze kust; leest waar, dus geen optelling
    { id: "jma_seamless", naam: "JMA 10 km", dagen: 7, arthur: false, tijd: true, off: true, klasse: "globaal", w: 1 },
    { id: "gem_global", naam: "GEM 15 km", dagen: 7, arthur: false, tijd: true, off: true, klasse: "globaal", w: 1 }
  ];
  // ensembles: 31 GFS-runs en 51 ECMWF-runs, voor de kans op kitewind vanaf dag 3 (alleen wind, geen vlagen/richting)
  var ENSEMBLES = [{ id: "gfs", model: "gfs025" }, { id: "ecmwf", model: "ecmwf_ifs025" }];
  var r1 = function (x) { return x == null ? null : Math.round(x * 10) / 10; };

  function haal(url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }

  function spot(s) {
    var basis = "latitude=" + s.lat + "&longitude=" + s.lon + "&forecast_days=7&timezone=Europe/Amsterdam";
    return Promise.all([
      haal("https://api.open-meteo.com/v1/forecast?" + basis + "&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m,weather_code,temperature_2m,precipitation&daily=sunrise,sunset&wind_speed_unit=kn&models=knmi_seamless"),
      haal("https://marine-api.open-meteo.com/v1/marine?" + basis + "&hourly=wave_height,wave_period,wave_direction,wind_wave_height,wind_wave_period,swell_wave_height,swell_wave_period,swell_wave_direction"),
      haal("https://api.open-meteo.com/v1/forecast?" + basis + "&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m&wind_speed_unit=kn&models=" + MODELLEN.map(function (m) { return m.id; }).join(","))
    ].concat(ENSEMBLES.map(function (e) {
      return haal("https://ensemble-api.open-meteo.com/v1/ensemble?" + basis + "&hourly=wind_speed_10m&wind_speed_unit=kn&models=" + e.model).catch(function () { return null; });
    }))).then(function (res) {
      var j = res[0].hourly, m = res[1].hourly, mw = res[2].hourly, per = {};
      MODELLEN.forEach(function (mo) {
        var k = mo.id, ws = mw["wind_speed_10m_" + k] || mw.wind_speed_10m, gs = mw["wind_gusts_10m_" + k] || mw.wind_gusts_10m, ds = mw["wind_direction_10m_" + k] || mw.wind_direction_10m;
        per[k] = j.time.map(function (t) { var i = mw.time.indexOf(t); return i < 0 || ws[i] == null ? null : [Math.round(ws[i]), Math.round(gs[i]), Math.round(ds[i])]; });
      });
      // per ensemble per uur: alle ledenwaarden (afgerond), zodat de pagina zelf de kans kan tellen bij elke drempel
      var ens = {};
      ENSEMBLES.forEach(function (e, n) {
        var h = res[3 + n] && res[3 + n].hourly; if (!h) return;
        var keys = Object.keys(h).filter(function (k) { return k.indexOf("wind_speed_10m") === 0; });
        ens[e.id] = j.time.map(function (t) { var i = h.time.indexOf(t); if (i < 0) return null;
          var v = keys.map(function (k) { return h[k][i]; }).filter(function (x) { return x != null; }).map(Math.round); return v.length ? v : null; });
      });
      return { lat: s.lat, lon: s.lon, modellen: per, ens: ens,
        uren: j.time.map(function (t, i) { return { t: t, kn: Math.round(j.wind_speed_10m[i]), vl: Math.round(j.wind_gusts_10m[i]), dir: Math.round(j.wind_direction_10m[i]),
          wx: j.weather_code[i], temp: Math.round(j.temperature_2m[i]), mm: j.precipitation[i],
          golf: m.wave_height[i] == null ? null : { m: m.wave_height[i], s: r1(m.wave_period[i]), dir: Math.round(m.wave_direction[i]),
            chop: m.wind_wave_height[i], chopS: r1(m.wind_wave_period[i]), swell: m.swell_wave_height[i], swellS: r1(m.swell_wave_period[i]), swellDir: Math.round(m.swell_wave_direction[i]) } }; }),
        zon: res[0].daily.time.map(function (d, i) { return { d: d, op: res[0].daily.sunrise[i].slice(11), onder: res[0].daily.sunset[i].slice(11) }; }) };
    });
  }

  /* Cache 30 minuten per spot in de browser: Open-Meteo is gratis maar telt aanvragen. */
  /* DATAVERSIE ophogen als de vorm van de spotdata verandert: oude browsercache wordt dan genegeerd en opgeruimd. */
  var VERS = 30 * 60e3, DATAVERSIE = "v2", MODEL_INFO = { gegenereerd: new Date().toISOString(), bron: "Open-Meteo, live", live: true, modellen: MODELLEN, spots: {} };
  function uitCache(id) { try { var c = JSON.parse(localStorage.getItem("kiteweer-uur:" + DATAVERSIE + ":" + id) || "null"); return c && Date.now() - c.op < VERS ? c.data : null; } catch (e) { return null; } }
  function naarCache(id, data) { try { localStorage.setItem("kiteweer-uur:" + DATAVERSIE + ":" + id, JSON.stringify({ op: Date.now(), data: data })); } catch (e) {} }
  try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf("kiteweer-uur:") === 0 && k.indexOf("kiteweer-uur:" + DATAVERSIE + ":") !== 0) localStorage.removeItem(k); }); } catch (e) {}

  window.KWU = MODEL_INFO;
  var bezig = {};
  /* Zorgt dat KWU.spots[id] bestaat. Volgorde: geheugen → browsercache → live → uur.js-bundel. */
  window.KWU_LAAD = function (id) {
    if (window.KWU.spots[id]) return Promise.resolve();
    if (bezig[id]) return bezig[id];
    var s = (window.KW.spots || []).filter(function (x) { return x.id === id; })[0];
    if (!s) return Promise.reject(new Error("onbekende spot " + id));
    var c = uitCache(id);
    if (c) { window.KWU.spots[id] = c; return Promise.resolve(); }
    bezig[id] = spot(s).then(function (data) { naarCache(id, data); window.KWU.spots[id] = data; })
      .catch(function (e) { console.warn("live data mislukt voor " + id + ", terugval op uur.js", e); return terugval().then(function () {
        if (!window.KWU.spots[id]) throw new Error("geen data voor " + id); }); })
      .then(function () { delete bezig[id]; });
    return bezig[id];
  };
  function terugval() {
    if (window.KWU_BUNDEL) return Promise.resolve();
    return new Promise(function (ok) { var el = document.createElement("script"); el.src = "uur.js"; el.onload = ok; el.onerror = ok;
      var live = window.KWU; window.KWU_BUNDEL = true;
      el.onload = function () { var b = window.KWU; window.KWU = live; Object.keys(b.spots || {}).forEach(function (k) { if (!live.spots[k]) live.spots[k] = b.spots[k]; }); live.live = false; live.gegenereerd = b.gegenereerd; ok(); };
      document.head.appendChild(el); });
  }
  /* Wanneer heeft een model voor het laatst GEREKEND? Dat is iets heel anders dan wanneer jouw
     browser de cijfers ophaalde, en precies wat de regel bovenin moest zeggen. Stond daar eerst
     de tijd van het paginabezoek, dus altijd "net", ook als de cijfers uit de browsercache van
     een half uur geleden kwamen (gemeten 12-09).
     Open-Meteo zet per model een meta.json neer met de tijd waarop de laatste ronde beschikbaar
     kwam. Alleen de echte modellen hebben er een; de "seamless"-reeksen zijn samengeplakt uit
     meerdere modellen en geven 500. Die slaan we stil over: we nemen de NIEUWSTE ronde die we
     vinden, want dat is het verste dat deze pagina kan kijken.
     Vier kleine bestanden, 15 minuten in de browser bewaard, en niets wacht erop: de regel vult
     zichzelf in zodra ze binnen zijn. */
  var RUNVERS = 15 * 60e3;
  window.KWU_RUNS = function () {
    try { var c = JSON.parse(localStorage.getItem("kiteweer-run:" + DATAVERSIE) || "null");
      if (c && Date.now() - c.op < RUNVERS) return Promise.resolve(c.ts); } catch (e) {}
    /* Alleen de modellen met meta:true worden gevraagd. De rest ("seamless"-reeksen, samengeplakt
       uit meerdere modellen) geeft 500 terug: gevangen, maar de browser schrijft die fout toch in
       de console en dan meldt qa.mjs terecht zes fouten op een schone pagina (gemeten 12-09). */
    return Promise.all(MODELLEN.filter(function (m) { return m.meta; }).map(function (m) {
      return haal("https://api.open-meteo.com/data/" + m.id + "/static/meta.json")
        .then(function (j) { return j.last_run_availability_time ? j.last_run_availability_time * 1000 : null; })
        .catch(function () { return null; });
    })).then(function (ts) {
      var goed = ts.filter(Boolean); if (!goed.length) return null;
      var nieuwste = Math.max.apply(null, goed);
      try { localStorage.setItem("kiteweer-run:" + DATAVERSIE, JSON.stringify({ op: Date.now(), ts: nieuwste })); } catch (e) {}
      return nieuwste;
    });
  };
  window.KWU_READY = Promise.resolve();
})();
