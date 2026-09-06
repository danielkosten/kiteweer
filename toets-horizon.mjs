// Hoe goed is elk model en elke mix op 1..7 dagen vooruit? Open-Meteo bewaart per dag de eerdere runs
// (previous-runs API); vergeleken met KNMI-uurwind (FH), daglicht 07–20, afgelopen 60 dagen.
//   node toets-horizon.mjs            (STATIONS en DAGEN hieronder aanpassen)
// Maten: fout = gemiddelde afwijking in kn (bias tussen haakjes); HSS = Heidke Skill Score op "wind ≥ 14 kn",
// dezelfde maat als windcalendar (0 = gokken, 1 = perfect); raak/mis/vals = uren ≥14 kn.
// Let op: een pier meet hoger dan het strand, een landmast lager. Vergelijk daarom altijd twee soorten stations.
const STATIONS = { 330: ["Hoek van Holland, pier", 51.992, 4.122, 3], 225: ["IJmuiden, pier", 52.463, 4.555, 4], 235: ["De Kooy, landmast", 52.928, 4.781, 0] };
const DAGEN = 60, L = [1, 2, 3, 4, 5, 6, 7], DREMPEL = 14;
const FIJN = ["knmi_harmonie_arome_netherlands", "icon_d2", "ukmo_uk_deterministic_2km"];   // AROME-HD zit niet in het archief
const GROF = ["ecmwf_ifs", "gfs_seamless", "icon_seamless", "gem_global", "jma_seamless"], ARPEGE = "meteofrance_seamless";
const ALLE = FIJN.concat(GROF, [ARPEGE, "ecmwf_ifs025", "ukmo_global_deterministic_10km"]);
const med = v => { v = v.filter(x => x != null).sort((a, b) => a - b); return v.length ? v[Math.floor((v.length - 1) / 2)] : null; };
// de mixen van de pagina (gewichten 1, want in het archief zit per klasse maar één run per model)
const MIX = off => ({
  "huidig DAJK (fijn, dan ECMWF9/GFS/ICON)": q => { const f = med(FIJN.map(m => q[m])); return f ?? med(["ecmwf_ifs", "gfs_seamless", "icon_seamless"].map(m => q[m])); },
  "DAJK-tijd (fijn, dan grof+off, ARPEGE, JMA, GEM)": q => { const f = med(FIJN.map(m => q[m])); if (f != null) return f;
    return med(GROF.map(m => q[m] == null ? null : q[m] + off).concat([q[ARPEGE]])); },
  "ARPEGE alleen": q => q[ARPEGE], "ECMWF 9 km": q => q["ecmwf_ifs"], "ECMWF 25 km": q => q["ecmwf_ifs025"], "GFS": q => q["gfs_seamless"], "ICON": q => q["icon_seamless"], "JMA": q => q["jma_seamless"], "GEM": q => q["gem_global"]
});
const hss = (a, b, c, d) => { const n = a + b + c + d, e = ((a + b) * (a + c) + (c + d) * (b + d)) / n; return n - e ? (a + d - e) / (n - e) : 0; };
const s = new Date(Date.now() - DAGEN * 864e5).toISOString().slice(0, 10).replace(/-/g, ""), e = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const knmi = await (await fetch("https://www.daggegevens.knmi.nl/klimatologie/uurgegevens", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
  body: `stns=${Object.keys(STATIONS).join(":")}&start=${s}01&end=${e}24&vars=FH&fmt=json` })).json();
const meet = {}; for (const r of knmi) { if (r.FH == null) continue; const d = new Date(Date.UTC(+r.date.slice(0, 4), +r.date.slice(5, 7) - 1, +r.date.slice(8, 10), r.hour - 1) + 2 * 3600e3);
  (meet[r.station_code] ??= {})[d.toISOString().slice(0, 13)] = r.FH * 0.1 * 1.944; }
for (const [code, [naam, lat, lon, off]] of Object.entries(STATIONS)) {
  const p = (await (await fetch(`https://previous-runs-api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${L.map(l => "wind_speed_10m_previous_day" + l).join(",")}&wind_speed_unit=kn&timezone=Europe/Amsterdam&past_days=${DAGEN}&forecast_days=1&models=${ALLE.join(",")}`)).json()).hourly;
  if (!p) { console.log(naam, "geen data"); continue; }
  console.log(`\n== ${naam} (${code}), optelling grof +${off}   fout(bias) HSS@${DREMPEL} raak/mis/vals`);
  for (const [mix, fn] of Object.entries(MIX(off))) { let row = mix.padEnd(48);
    for (const l of L) { let n = 0, mae = 0, b = 0, a = 0, bb = 0, c = 0, d = 0;
      p.time.forEach((t, i) => { const u = +t.slice(11, 13), o = meet[code]?.[t.slice(0, 13)]; if (u < 7 || u > 20 || o == null) return;
        const q = {}; for (const m of ALLE) q[m] = p[`wind_speed_10m_previous_day${l}_${m}`]?.[i] ?? null;
        const v = fn(q); if (v == null) return; n++; mae += Math.abs(v - o); b += v - o;
        if (v >= DREMPEL && o >= DREMPEL) a++; else if (v >= DREMPEL) bb++; else if (o >= DREMPEL) c++; else d++; });
      row += n > 50 ? ` | d${l} ${(mae / n).toFixed(1)}(${(b / n).toFixed(1).padStart(4)}) ${hss(a, bb, c, d).toFixed(2)} ${a}/${c}/${bb}` : ` | d${l} -`; }
    console.log(row); }
}
