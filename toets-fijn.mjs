// Lezen de vier fijne modellen structureel te laag aan de kust? Meting, geen wijziging aan de site.
//   node toets-fijn.mjs
// Voorspellingen: Open-Meteo previous-runs API, dag 1 (fijne modellen zijn alleen op dag 1 te meten).
// Metingen: KNMI uurgegevens, FH = uurgemiddelde wind in 0,1 m/s, DD = richting in graden.
// Daglicht 07-20 lokale tijd. Bias = model min meting, in knopen; negatief = het model leest te laag.
const STATIONS = {                                    // code: [naam, lat, lon, soort]
  330: ["Hoek van Holland", 51.992, 4.122, "pier"],
  225: ["IJmuiden", 52.463, 4.555, "pier"],
  235: ["De Kooy", 52.928, 4.781, "landmast"],
  343: ["Geulhaven", 51.893, 4.313, "haven"],         // levert ook FH, erbij als derde soort
};
const DAGEN = 60, DREMPEL = 14, MIN_N = 30;           // MIN_N: cellen met minder uren zeggen niets
const UUR_VAN = 7, UUR_TOT = 20;                      // daglicht, lokale tijd
// De vier fijne modellen met Arthurs skill-gewichten (windcalendar SPEC.md par. 13), zoals gen-uur.mjs ze gebruikt
const FIJN = [
  ["meteofrance_arome_france_hd", "AROME-HD 1,3 km", 1.16],
  ["icon_d2", "ICON-D2 2 km", 1.03],
  ["ukmo_uk_deterministic_2km", "UKV 2 km", 0.93],
  ["knmi_harmonie_arome_netherlands", "KNMI Harmonie 2 km", 0.88],
];
const BANDEN = [[0, 10, "< 10"], [10, 14, "10-14"], [14, 20, "14-20"], [20, 25, "20-25"], [25, 99, "> 25"]];
const SECTOREN = [[0, 45, "N-NO"], [45, 90, "NO-O"], [90, 135, "O-ZO"], [135, 180, "ZO-Z"], [180, 225, "Z-ZW"], [225, 270, "ZW-W"], [270, 315, "W-NW"], [315, 360, "NW-N"]];
const CACHE = "/private/tmp/claude-501/-Users-danielunravel-Code-personal-kiteweer/eb4cf35d-f251-46be-93ce-533c22cdac00/scratchpad/fijn-uren.json";

import fs from "node:fs";
// gewogen middelste waarde, zelfde kern als verifieer.mjs en de pagina
const wmed = (paren) => { const p = paren.filter(x => x[0] != null).sort((a, b) => a[0] - b[0]);
  const tot = p.reduce((a, x) => a + x[1], 0); if (!tot) return null; let acc = 0;
  for (const x of p) { acc += x[1]; if (acc >= tot / 2) return x[0]; } return null; };
const hss = (a, b, c, d) => { const n = a + b + c + d, e = ((a + b) * (a + c) + (c + d) * (b + d)) / n; return n - e ? (a + d - e) / (n - e) : 0; };
const gem = v => v.reduce((a, b) => a + b, 0) / v.length;

// ── ophalen (met checkpoint, zodat een tweede run niets hoeft te halen) ──
let rows;
if (fs.existsSync(CACHE)) { rows = JSON.parse(fs.readFileSync(CACHE, "utf8")); console.log(`uit cache: ${rows.length} uren (${CACHE})`); }
else {
  const s = new Date(Date.now() - DAGEN * 864e5).toISOString().slice(0, 10).replace(/-/g, ""), e = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const knmi = await (await fetch("https://www.daggegevens.knmi.nl/klimatologie/uurgegevens", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `stns=${Object.keys(STATIONS).join(":")}&start=${s}01&end=${e}24&vars=FH:FX:DD&fmt=json` })).json();
  // KNMI hour loopt 1..24 in UTC en eindigt op dat uur, dus het uur begint op hour-1 UTC; +2 uur naar lokale tijd
  const meet = {}; for (const r of knmi) { if (r.FH == null) continue;
    const d = new Date(Date.UTC(+r.date.slice(0, 4), +r.date.slice(5, 7) - 1, +r.date.slice(8, 10), r.hour - 1) + 2 * 3600e3);
    (meet[r.station_code] ??= {})[d.toISOString().slice(0, 13)] = { kn: r.FH * 0.1 * 1.944, fx: r.FX == null ? null : r.FX * 0.1 * 1.944, dd: r.DD }; }
  rows = [];
  for (const [code, [naam, lat, lon, soort]] of Object.entries(STATIONS)) {
    const p = (await (await fetch(`https://previous-runs-api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m_previous_day1&wind_speed_unit=kn&timezone=Europe/Amsterdam&past_days=${DAGEN}&forecast_days=1&models=${FIJN.map(m => m[0]).join(",")}`)).json()).hourly;
    if (!p) { console.log(naam, "geen voorspellingen"); continue; }
    p.time.forEach((t, i) => { const u = +t.slice(11, 13), o = meet[code]?.[t.slice(0, 13)];
      if (u < UUR_VAN || u > UUR_TOT || o == null) return;
      const per = {}; let iets = false;
      for (const [id] of FIJN) { const v = p[`wind_speed_10m_previous_day1_${id}`]?.[i] ?? null; per[id] = v; if (v != null) iets = true; }
      if (iets) rows.push({ code, naam, soort, t, meet: o.kn, dd: o.dd, per }); });
    console.log(`gehaald: ${naam} (${code})`);
  }
  fs.mkdirSync(CACHE.slice(0, CACHE.lastIndexOf("/")), { recursive: true });
  fs.writeFileSync(CACHE, JSON.stringify(rows));
  console.log(`opgeslagen: ${rows.length} uren in ${CACHE}`);
}
const CODES = [...new Set(rows.map(r => r.code))];
const mixw = r => wmed(FIJN.map(m => [r.per[m[0]], m[2]]));
const periode = [rows[0]?.t.slice(0, 10), rows[rows.length - 1]?.t.slice(0, 10)];
console.log(`\nperiode ${periode[0]} t/m ${periode[1]}, daglicht ${UUR_VAN}-${UUR_TOT}, ${rows.length} gekoppelde uren`);

const cel = (rs, fn) => { const d = rs.map(r => [fn(r), r.meet]).filter(x => x[0] != null);
  if (d.length < MIN_N) return { n: d.length, leeg: true };
  return { n: d.length, bias: gem(d.map(x => x[0] - x[1])), mae: gem(d.map(x => Math.abs(x[0] - x[1]))) }; };
const toon = c => c.leeg ? `  -(${c.n})`.padStart(14) : `${c.bias.toFixed(1)}/${c.mae.toFixed(1)}(${c.n})`.padStart(14);

// ── 1. is het structureel? ──
console.log(`\n=== 1. Bias en gemiddelde absolute fout per model, per station  [bias/fout(n)] ===`);
console.log("model".padEnd(22) + CODES.map(c => `${STATIONS[c][0]} ${STATIONS[c][3]}`.padStart(14)).join(""));
for (const [id, naam] of FIJN) console.log(naam.padEnd(22) + CODES.map(c => toon(cel(rows.filter(r => r.code == c), r => r.per[id]))).join(""));
console.log("FIJNE MIX".padEnd(22) + CODES.map(c => toon(cel(rows.filter(r => r.code == c), mixw))).join(""));
console.log("alles samen: " + FIJN.map(([id, n]) => `${n} ${cel(rows, r => r.per[id]).bias.toFixed(1)}`).join(" | ") + ` | MIX ${cel(rows, mixw).bias.toFixed(1)}`);

// ── 2. hangt het van de windsterkte af? ──
console.log(`\n=== 2. Bias per windband (op de GEMETEN wind), fijne mix  [bias/fout(n)] ===`);
console.log("station".padEnd(22) + BANDEN.map(b => b[2].padStart(14)).join(""));
for (const c of CODES) console.log(`${STATIONS[c][0]}`.padEnd(22) + BANDEN.map(b => toon(cel(rows.filter(r => r.code == c && r.meet >= b[0] && r.meet < b[1]), mixw))).join(""));
console.log("alle stations".padEnd(22) + BANDEN.map(b => toon(cel(rows.filter(r => r.meet >= b[0] && r.meet < b[1]), mixw))).join(""));
console.log("piers".padEnd(22) + BANDEN.map(b => toon(cel(rows.filter(r => r.soort == "pier" && r.meet >= b[0] && r.meet < b[1]), mixw))).join(""));
// vlak of niet: het verschil tussen de laagste en de hoogste band met genoeg uren
const bandbias = BANDEN.map(b => cel(rows.filter(r => r.soort == "pier" && r.meet >= b[0] && r.meet < b[1]), mixw)).filter(x => !x.leeg).map(x => x.bias);
console.log(`piers: bias loopt van ${Math.max(...bandbias).toFixed(1)} tot ${Math.min(...bandbias).toFixed(1)} kn over de banden, spreiding ${(Math.max(...bandbias) - Math.min(...bandbias)).toFixed(1)} kn`);
console.log(`  vlak (spreiding onder 1,5 kn) = een vaste optelling mag; niet vlak = de fout groeit mee met de wind, dan past vermenigvuldigen beter`);

// ── optelling tegen vermenigvuldiging: welke correctie laat de kleinste fout over? ──
console.log(`\n=== 2b. Wat laat de kleinste fout over: optellen of vermenigvuldigen? (fijne mix) ===`);
const groepen = [["piers samen", r => r.soort == "pier"], ...CODES.map(c => [STATIONS[c][0], r => r.code == c])];
for (const [naam, filt] of groepen) {
  const d = rows.filter(filt).map(r => [mixw(r), r.meet]).filter(x => x[0] != null); if (d.length < MIN_N) continue;
  let bestA = null, bestF = null;
  for (let a = 0; a <= 6; a += 0.1) { const f = gem(d.map(x => Math.abs(x[0] + a - x[1]))); if (!bestA || f < bestA[1]) bestA = [a, f]; }
  for (let f = 1; f <= 1.6; f += 0.01) { const e = gem(d.map(x => Math.abs(x[0] * f - x[1]))); if (!bestF || e < bestF[1]) bestF = [f, e]; }
  const ruw = gem(d.map(x => Math.abs(x[0] - x[1])));
  console.log(`${naam.padEnd(22)} n ${String(d.length).padStart(4)}  fout ruw ${ruw.toFixed(2)}  |  beste optelling +${bestA[0].toFixed(1)} kn -> ${bestA[1].toFixed(2)}  |  beste factor x${bestF[0].toFixed(2)} -> ${bestF[1].toFixed(2)}  |  winnaar: ${bestA[1] <= bestF[1] ? "optelling" : "factor"}`);
}

// ── 3. hangt het van de richting af? ──
console.log(`\n=== 3. Bias per windrichtingsector (gemeten DD), fijne mix  [bias/fout(n)] ===`);
console.log("station".padEnd(16) + SECTOREN.map(s => s[2].padStart(14)).join(""));
for (const c of CODES) console.log(`${STATIONS[c][0]}`.padEnd(16) + SECTOREN.map(s => toon(cel(rows.filter(r => r.code == c && r.dd != null && r.dd >= s[0] && r.dd < s[1]), mixw))).join(""));
console.log("piers".padEnd(16) + SECTOREN.map(s => toon(cel(rows.filter(r => r.soort == "pier" && r.dd != null && r.dd >= s[0] && r.dd < s[1]), mixw))).join(""));
// aanlandig = wind van zee, ruwweg 180-360 graden voor deze kust; aflandig = de rest
const aan = cel(rows.filter(r => r.soort == "pier" && r.dd >= 180 && r.dd <= 360), mixw), af = cel(rows.filter(r => r.soort == "pier" && r.dd != null && r.dd < 180), mixw);
console.log(`piers aanlandig (180-360): bias ${aan.bias?.toFixed(1)} kn, n ${aan.n}   |   aflandig (0-180): bias ${af.bias?.toFixed(1)} kn, n ${af.n}`);

// ── 4. pier tegen landmast ──
console.log(`\n=== 4. Pier tegen landmast, fijne mix ===`);
for (const soort of [...new Set(rows.map(r => r.soort))]) { const c = cel(rows.filter(r => r.soort == soort), mixw);
  console.log(`${soort.padEnd(10)} n ${String(c.n).padStart(4)}  bias ${c.bias.toFixed(1)} kn  fout ${c.mae.toFixed(1)} kn  (stations: ${[...new Set(rows.filter(r => r.soort == soort).map(r => STATIONS[r.code][0]))].join(", ")})`); }

// ── 5. de fijne mix apart per model gewogen: al in tabel 1. Hier de mix per station met beide correcties ──
console.log(`\n=== 5. De fijne MIX per station, ruw en na correctie (dit is wat de pagina gebruikt) ===`);
for (const c of CODES) { const d = rows.filter(r => r.code == c).map(r => [mixw(r), r.meet]).filter(x => x[0] != null); if (d.length < MIN_N) continue;
  const b = gem(d.map(x => x[0] - x[1])), f = gem(d.map(x => x[0] / (x[1] || 1)));
  console.log(`${STATIONS[c][0].padEnd(20)} ${STATIONS[c][3].padEnd(9)} n ${String(d.length).padStart(4)}  bias ${b.toFixed(1)}  fout ${gem(d.map(x => Math.abs(x[0] - x[1]))).toFixed(1)}  na +${(-b).toFixed(1)}: fout ${gem(d.map(x => Math.abs(x[0] - b - x[1]))).toFixed(1)}`); }

// ── 6. wat kost het aan de ondergrens van 14 kn? ──
console.log(`\n=== 6. Heidke Skill Score op "${DREMPEL} kn of meer", fijne mix (0 = gokken, 1 = perfect) ===`);
const scoor = (d, corr) => { let a = 0, b = 0, cc = 0, dd = 0; for (const [v0, o] of d) { const v = corr(v0);
    if (v >= DREMPEL && o >= DREMPEL) a++; else if (v >= DREMPEL) b++; else if (o >= DREMPEL) cc++; else dd++; }
  return { hss: hss(a, b, cc, dd), raak: a, mis: cc, vals: b }; };
for (const [naam, filt] of groepen) {
  const d = rows.filter(filt).map(r => [mixw(r), r.meet]).filter(x => x[0] != null); if (d.length < MIN_N) continue;
  let best = null; for (let a = 0; a <= 6; a += 0.1) { const f = gem(d.map(x => Math.abs(x[0] + a - x[1]))); if (!best || f < best[1]) best = [a, f]; }
  const r0 = scoor(d, v => v), r1 = scoor(d, v => v + best[0]);
  const echt = d.filter(x => x[1] >= DREMPEL).length;
  console.log(`${naam.padEnd(22)} n ${String(d.length).padStart(4)}  kitebare uren echt ${String(echt).padStart(4)}`);
  console.log(`${"".padEnd(22)} ruw      HSS ${r0.hss.toFixed(2)}  raak ${String(r0.raak).padStart(4)} / mis ${String(r0.mis).padStart(4)} / vals ${String(r0.vals).padStart(4)}  (mist ${(100 * r0.mis / (echt || 1)).toFixed(0)}% van de kitebare uren)`);
  console.log(`${"".padEnd(22)} +${best[0].toFixed(1)} kn  HSS ${r1.hss.toFixed(2)}  raak ${String(r1.raak).padStart(4)} / mis ${String(r1.mis).padStart(4)} / vals ${String(r1.vals).padStart(4)}  (mist ${(100 * r1.mis / (echt || 1)).toFixed(0)}%)`);
}
// dekking: hoeveel uren heeft elk model echt geleverd
console.log(`\ndekking per model (uren met een waarde, van ${rows.length}):`);
for (const [id, naam] of FIJN) console.log(`  ${naam.padEnd(22)} ${rows.filter(r => r.per[id] != null).length}`);

// ── 2c. Wat blijft er over per windband na correctie? Een goede correctie laat overal bijna nul over ──
console.log(`\n=== 2c. Rest-bias per windband na correctie, piers (bias/fout(n)) ===`);
const piers = rows.filter(r => r.soort == "pier");
console.log("correctie".padEnd(22) + BANDEN.map(b => b[2].padStart(14)).join(""));
for (const [lab, f] of [["geen", v => v], ["optelling +2,1 kn", v => v + 2.1], ["factor x1,20", v => v * 1.2]])
  console.log(lab.padEnd(22) + BANDEN.map(b => toon(cel(piers.filter(r => r.meet >= b[0] && r.meet < b[1]), r => { const v = mixw(r); return v == null ? null : f(v); }))).join(""));

// ── 2d. HSS met de factor erbij, naast de optelling ──
console.log(`\n=== 2d. HSS op "${DREMPEL} kn of meer" met factor, piers en per station ===`);
for (const [naam, filt] of groepen) { const d = rows.filter(filt).map(r => [mixw(r), r.meet]).filter(x => x[0] != null); if (d.length < MIN_N) continue;
  let bf = null; for (let f = 1; f <= 1.6; f += 0.01) { const e = gem(d.map(x => Math.abs(x[0] * f - x[1]))); if (!bf || e < bf[1]) bf = [f, e]; }
  const r = scoor(d, v => v * bf[0]);
  console.log(`${naam.padEnd(22)} factor x${bf[0].toFixed(2)}  HSS ${r.hss.toFixed(2)}  raak ${String(r.raak).padStart(4)} / mis ${String(r.mis).padStart(4)} / vals ${String(r.vals).padStart(4)}`); }
// en een factor die overal hetzelfde is, x1,20, zodat je ziet wat een enkele regel voor de hele kust kost
for (const [naam, filt] of groepen) { const d = rows.filter(filt).map(r => [mixw(r), r.meet]).filter(x => x[0] != null); if (d.length < MIN_N) continue;
  const r = scoor(d, v => v * 1.2); console.log(`${naam.padEnd(22)} overal x1,20  HSS ${r.hss.toFixed(2)}  raak ${String(r.raak).padStart(4)} / mis ${String(r.mis).padStart(4)} / vals ${String(r.vals).padStart(4)}  fout ${gem(d.map(x => Math.abs(x[0] * 1.2 - x[1]))).toFixed(2)}`); }

// ── 7. eerlijke vergelijking: alleen de uren waarop AROME-HD er ook is ──
console.log(`\n=== 7. Zelfde uren voor alle vier (alleen uren waarop AROME-HD data heeft), bias per model ===`);
const zelfde = rows.filter(r => r.per["meteofrance_arome_france_hd"] != null);
console.log("station".padEnd(22) + FIJN.map(m => m[1].split(" ")[0].padStart(14)).join("") + "MIX".padStart(14));
for (const c of CODES) { const rs = zelfde.filter(r => r.code == c);
  console.log(STATIONS[c][0].padEnd(22) + FIJN.map(m => toon(cel(rs, r => r.per[m[0]]))).join("") + toon(cel(rs, mixw))); }
