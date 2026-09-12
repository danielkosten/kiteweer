// Lezen de vier fijne weermodellen te laag aan de kust, ook in de winter? Meting over 3,5 jaar.
//   node toets-lang.mjs            (geen sleutel, geen npm, alles met fetch)
// Dit is een METING, geen wijziging aan de site. Niets hierin raakt app.js of de pagina.
//
// Voorspellingen: Open-Meteo historical-forecast-api (het archief van wat de modellen destijds zeiden).
//   De previous-runs API reikt maar 60 dagen; dit archief reikt tot 2023 en dat is waarom het hier staat.
// Metingen: KNMI uurgegevens. FH = uurgemiddelde wind in 0,1 m/s, FX = hoogste vlaag, DD = richting.
//   Knopen = FH * 0,1 * 1,944.
const VAN = "2023-01-01", TOT = "2026-09-10";         // 3,5 jaar, met vier winters erin
const STATIONS = {                                    // code: [naam, lat, lon, soort]
  330: ["Hoek van Holland", 51.992, 4.122, "pier"],
  225: ["IJmuiden", 52.463, 4.555, "pier"],
  235: ["De Kooy", 52.928, 4.781, "landmast"],
};
// De vier fijne modellen met Arthurs skill-gewichten (windcalendar SPEC.md), zoals verifieer.mjs ze gebruikt.
// vanaf = de eerste dag waarop Open-Meteo dit model in het archief heeft; eerder telt hij simpelweg niet mee.
const FIJN = [
  ["meteofrance_arome_france_hd", "AROME-HD 1,3 km", 1.16, "2023-01-01"],
  ["icon_d2", "ICON-D2 2 km", 1.03, "2023-01-01"],
  ["ukmo_uk_deterministic_2km", "UKV 2 km", 0.93, "2023-01-01"],
  ["knmi_harmonie_arome_netherlands", "KNMI Harmonie 2 km", 0.88, "2025-01-01"],
];
// De banden die de eigenaar wil zien, in knopen. Bovengrens telt niet mee (>= van, < tot).
const BANDEN = [[0,10,"< 10"],[10,14,"10-14"],[14,18,"14-18"],[18,22,"18-22"],[22,26,"22-26"],[26,30,"26-30"],[30,35,"30-35"],[35,40,"35-40"],[40,999,"40+"]];
const UUR_VAN = 7, UUR_TOT = 20;                      // daglicht, lokale tijd
const VEEL = 30, TEVEEL = 40;                         // de twee grenzen van de pagina, in knopen
const MIN_MODEL = 3;                                  // onder 3 kn is de verhouding echt/model onzin (delen door bijna nul)
const STORMGAT = 6;                                   // uren stilte die twee periodes tot losse "stormen" maakt
const WINTER = [10,11,12,1,2,3];                      // winter = oktober t/m maart
const CACHE = "/private/tmp/claude-501/-Users-danielunravel-Code-personal-kiteweer/eb4cf35d-f251-46be-93ce-533c22cdac00/scratchpad";

import fs from "node:fs";
fs.mkdirSync(CACHE, { recursive: true });
const slaap = ms => new Promise(r => setTimeout(r, ms));

// ── tijd ──────────────────────────────────────────────────────────────────
// KNMI geeft een datum en hour 1..24 in UTC; het uur BEGINT op hour-1 UTC.
// Open-Meteo geeft lokale tijd (Europe/Amsterdam), en die springt twee keer per jaar een uur.
// Daarom rekenen we elk uur apart om met een echte tijdzone, nooit met een vaste +2.
const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false });
const lokaalSleutel = (dUTC) => { const p = {}; for (const x of fmt.formatToParts(dUTC)) p[x.type] = x.value;
  return `${p.year}-${p.month}-${p.day}T${p.hour == "24" ? "00" : p.hour}`; };

// ── ophalen, in stukken van een jaar, elk stuk apart op schijf ────────────
const haal = async (bestand, url, opties) => {
  const pad = `${CACHE}/${bestand}`;
  if (fs.existsSync(pad)) return JSON.parse(fs.readFileSync(pad, "utf8"));
  for (let poging = 1; poging <= 5; poging++) {
    try { const r = await fetch(url, opties); if (r.status == 429) { await slaap(20000); continue; }
      const j = await r.json(); fs.writeFileSync(pad, JSON.stringify(j)); console.log(`  gehaald: ${bestand}`); await slaap(1200); return j;
    } catch (e) { console.log(`  poging ${poging} mislukt (${bestand}): ${e.message}`); await slaap(5000); }
  }
  throw new Error(`ophalen mislukt: ${bestand}`);
};
const jaren = []; for (let j = +VAN.slice(0,4); j <= +TOT.slice(0,4); j++) jaren.push(j);
const stuk = j => [j == +VAN.slice(0,4) ? VAN : `${j}-01-01`, j == +TOT.slice(0,4) ? TOT : `${j}-12-31`];

// metingen
console.log(`metingen KNMI ophalen (${VAN} t/m ${TOT})`);
const meet = {};                                       // meet[station]["YYYY-MM-DDTHH"] = {kn, fx, dd}
for (const j of jaren) { const [a, b] = stuk(j);
  const k = await haal(`knmi-${j}.json`, "https://www.daggegevens.knmi.nl/klimatologie/uurgegevens",
    { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
      body: `stns=${Object.keys(STATIONS).join(":")}&start=${a.replace(/-/g,"")}01&end=${b.replace(/-/g,"")}24&vars=FH:FX:DD&fmt=json` });
  for (const r of k) { if (r.FH == null) continue;
    const d = new Date(Date.UTC(+r.date.slice(0,4), +r.date.slice(5,7)-1, +r.date.slice(8,10), r.hour - 1));
    (meet[r.station_code] ??= {})[lokaalSleutel(d)] = { kn: r.FH*0.1*1.944, fx: r.FX == null ? null : r.FX*0.1*1.944, dd: r.DD }; } }
for (const c of Object.keys(STATIONS)) console.log(`  ${STATIONS[c][0]}: ${Object.keys(meet[c] ?? {}).length} gemeten uren`);

// voorspellingen
console.log(`voorspellingen Open-Meteo ophalen`);
const rows = [];
for (const [code, [naam, lat, lon, soort]] of Object.entries(STATIONS)) {
  for (const j of jaren) { const [a, b] = stuk(j);
    const modellen = FIJN.filter(m => +m[3].slice(0,4) <= j);
    const p = (await haal(`om-${code}-${j}.json`,
      `https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&start_date=${a}&end_date=${b}` +
      `&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m&wind_speed_unit=kn&timezone=Europe/Amsterdam&models=${modellen.map(m=>m[0]).join(",")}`)).hourly;
    if (!p) { console.log(`  ${naam} ${j}: geen data`); continue; }
    p.time.forEach((t, i) => { const s = t.slice(0,13), o = meet[code]?.[s]; if (!o) return;
      const per = {}, vlaag = {}; let iets = false;
      for (const [id] of FIJN) { const v = p[`wind_speed_10m_${id}`]?.[i] ?? null; per[id] = v;
        vlaag[id] = p[`wind_gusts_10m_${id}`]?.[i] ?? null; if (v != null) iets = true; }
      if (iets) rows.push({ code, naam, soort, t: s, maand: +s.slice(5,7), uur: +s.slice(11,13), meet: o.kn, fx: o.fx, dd: o.dd, per, vlaag }); }); } }

// ── rekenkern, zelfde als de pagina ───────────────────────────────────────
// gewogen middelste waarde: sorteer de modellen op waarde, loop door tot je de helft van het gewicht hebt
const wmed = paren => { const p = paren.filter(x => x[0] != null).sort((a,b) => a[0]-b[0]);
  const tot = p.reduce((a,x) => a+x[1], 0); if (!tot) return null; let acc = 0;
  for (const x of p) { acc += x[1]; if (acc >= tot/2) return x[0]; } return null; };
const mixw = r => wmed(FIJN.map(m => [r.per[m[0]], m[2]]));
const mixv = r => wmed(FIJN.map(m => [r.vlaag[m[0]], m[2]]));
const gem = v => v.reduce((a,b) => a+b, 0) / (v.length || 1);
const mediaan = v => { const s = [...v].sort((a,b) => a-b); return s.length ? s[Math.floor((s.length-1)/2)] : null; };
// 95%-betrouwbaarheidsinterval op een gemiddelde: gemiddelde plus/min 1,96 keer de standaardfout
const ci95 = v => { if (v.length < 2) return null; const m = gem(v);
  const sd = Math.sqrt(v.reduce((a,x) => a + (x-m)**2, 0) / (v.length - 1)); const se = sd / Math.sqrt(v.length);
  return { m, lo: m - 1.96*se, hi: m + 1.96*se, breedte: 2*1.96*se }; };
const pct = (a, b) => b ? (100*a/b).toFixed(2) : "-";
const band = v => BANDEN.find(b => v >= b[0] && v < b[1]);
const dag = rows.length ? null : null;

const PIERS = rows.filter(r => r.soort == "pier");
const CODES = Object.keys(STATIONS).filter(c => rows.some(r => r.code == c));
console.log(`\n${"=".repeat(100)}`);
console.log(`periode ${VAN} t/m ${TOT}, ${rows.length} gekoppelde uren (meting en minstens een model)`);
const jarenInData = [...new Set(rows.map(r => r.t.slice(0,4)))].sort();
console.log(`jaren in de data: ${jarenInData.join(", ")}`);
const winters = [...new Set(rows.filter(r => WINTER.includes(r.maand)).map(r => { const j = +r.t.slice(0,4); return r.maand >= 10 ? `${j}/${j+1}` : `${j-1}/${j}`; }))].sort();
console.log(`winterseizoenen (okt t/m mrt) met uren: ${winters.length} -> ${winters.join(", ")}`);
console.log(`dekking per model (uren met een waarde, van ${rows.length}):`);
for (const [id, naam, , vanaf] of FIJN) console.log(`  ${naam.padEnd(22)} vanaf ${vanaf}  ${rows.filter(r => r.per[id] != null).length} uren wind, ${rows.filter(r => r.vlaag[id] != null).length} uren vlaag`);

// ── 1. hoe vaak komt elke windband uberhaupt voor? ────────────────────────
console.log(`\n=== 1. Hoe vaak komt elke windband voor? (op de GEMETEN wind) ===`);
for (const [lab, filt] of [["alle uren", () => true], ["daglicht 07-20", r => r.uur >= UUR_VAN && r.uur <= UUR_TOT]]) {
  console.log(`\n-- ${lab} --`);
  console.log("station".padEnd(20) + "totaal".padStart(9) + BANDEN.map(b => b[2].padStart(15)).join(""));
  for (const c of CODES) { const rs = rows.filter(r => r.code == c && filt(r));
    console.log(STATIONS[c][0].padEnd(20) + String(rs.length).padStart(9) +
      BANDEN.map(b => { const n = rs.filter(r => r.meet >= b[0] && r.meet < b[1]).length; return `${n} (${pct(n, rs.length)}%)`.padStart(15); }).join("")); }
  const rs = rows.filter(filt);
  console.log("alles samen".padEnd(20) + String(rs.length).padStart(9) +
    BANDEN.map(b => { const n = rs.filter(r => r.meet >= b[0] && r.meet < b[1]).length; return `${n} (${pct(n, rs.length)}%)`.padStart(15); }).join(""));
}

// ── 2. de verhouding echt/model per band, met n en 95%-interval ───────────
// verhouding = gemeten wind gedeeld door de fijne mix. 1,10 betekent: het model leest 10% te laag.
const verh = rs => { const v = rs.map(r => { const m = mixw(r); return (m == null || m < MIN_MODEL) ? null : r.meet/m; }).filter(x => x != null); return { v, c: ci95(v) }; };
const toonVerh = ({v, c}) => c == null ? `-(${v.length})`.padStart(28)
  : `${c.m.toFixed(3)} [${c.lo.toFixed(3)};${c.hi.toFixed(3)}] n${v.length}`.padStart(28);
console.log(`\n=== 2. Verhouding echt/model per band, fijne mix, met 95%-interval  [verhouding lo;hi n] ===`);
console.log(`(band op de GEMETEN wind; alleen uren waarop het model minstens ${MIN_MODEL} kn zei)`);
console.log(`een interval breder dan 0,15 bewijst niets; dat staat er dan achter`);
for (const [lab, filt] of [["Hoek van Holland", r => r.code == "330"], ["IJmuiden", r => r.code == "225"], ["De Kooy", r => r.code == "235"], ["piers samen", r => r.soort == "pier"]]) {
  console.log(`\n-- ${lab} --`);
  for (const b of BANDEN) { const x = verh(rows.filter(r => filt(r) && r.meet >= b[0] && r.meet < b[1]));
    const breed = x.c && x.c.breedte > 0.15 ? "   <- interval te breed, bewijst niets" : (x.c ? "" : "   <- geen uren");
    console.log(`  ${b[2].padEnd(8)}${toonVerh(x)}${breed}`); }
}

// ── 3. eenmalige storm of structureel? ────────────────────────────────────
console.log(`\n=== 3. Rusten de hoge banden op losse stormen? (banden vanaf 22 kn) ===`);
const stormen = rs => { const t = [...new Set(rs.map(r => r.t))].sort(); const groepen = []; let g = null;
  for (const s of t) { const u = new Date(s + ":00:00Z").getTime();
    if (g && u - g.eind <= STORMGAT*3600e3) { g.eind = u; g.n++; } else { g = { start: s, eind: u, n: 1 }; groepen.push(g); } }
  return groepen; };
for (const c of CODES) { console.log(`\n-- ${STATIONS[c][0]} --`);
  for (const b of BANDEN.filter(b => b[0] >= 22)) {
    const rs = rows.filter(r => r.code == c && r.meet >= b[0] && r.meet < b[1]);
    if (!rs.length) { console.log(`  ${b[2].padEnd(8)} 0 uren`); continue; }
    const dagen = [...new Set(rs.map(r => r.t.slice(0,10)))], g = stormen(rs).sort((a,b2) => b2.n - a.n);
    const top = g.slice(0,3), aandeel = pct(top.reduce((a,x) => a+x.n, 0), rs.length);
    console.log(`  ${b[2].padEnd(8)} ${String(rs.length).padStart(5)} uren op ${String(dagen.length).padStart(4)} dagen, ${String(g.length).padStart(4)} losse periodes; top 3 periodes = ${aandeel}% van de uren (${top.map(x => `${x.start.slice(0,10)}:${x.n}u`).join(", ")})`); } }

// ── 4. winter tegen zomer ─────────────────────────────────────────────────
console.log(`\n=== 4. Winter (okt t/m mrt) tegen zomer (apr t/m sep), verhouding echt/model ===`);
for (const [lab, filt] of [["Hoek van Holland", r => r.code == "330"], ["IJmuiden", r => r.code == "225"], ["De Kooy", r => r.code == "235"], ["piers samen", r => r.soort == "pier"]]) {
  console.log(`\n-- ${lab} --`);
  console.log("  band".padEnd(12) + "WINTER".padStart(28) + "ZOMER".padStart(28) + "   verschil");
  for (const b of BANDEN) {
    const w = verh(rows.filter(r => filt(r) && WINTER.includes(r.maand) && r.meet >= b[0] && r.meet < b[1]));
    const z = verh(rows.filter(r => filt(r) && !WINTER.includes(r.maand) && r.meet >= b[0] && r.meet < b[1]));
    const d = w.c && z.c ? (w.c.m - z.c.m).toFixed(3) + (Math.max(w.c.breedte, z.c.breedte) > 0.15 ? " (intervallen te breed)" : (w.c.lo > z.c.hi || z.c.lo > w.c.hi ? " (echt verschil)" : " (overlap, geen verschil aantoonbaar)")) : "-";
    console.log(`  ${b[2].padEnd(10)}${toonVerh(w)}${toonVerh(z)}   ${d}`); }
}
console.log(`\nper maand, piers, alle banden samen (verhouding echt/model):`);
for (let m = 1; m <= 12; m++) { const x = verh(PIERS.filter(r => r.maand == m));
  console.log(`  maand ${String(m).padStart(2)}  ${toonVerh(x)}`); }

// ── 5. de twee grenzen van de pagina, direct getoetst ─────────────────────
console.log(`\n=== 5. De grenzen ${VEEL} kn (VEEL) en ${TEVEEL} kn (TEVEEL), rechtstreeks gemeten ===`);
for (const [lab, filt] of [["Hoek van Holland", r => r.code == "330"], ["IJmuiden", r => r.code == "225"], ["De Kooy", r => r.code == "235"], ["piers samen", r => r.soort == "pier"]]) {
  console.log(`\n-- ${lab} --`);
  for (const G of [VEEL, TEVEEL]) {
    const echt = rows.filter(r => filt(r) && r.meet >= G && mixw(r) != null);
    const gemist = echt.filter(r => mixw(r) < G);
    console.log(`  echt >= ${G} kn: ${echt.length} uren; model zei minder dan ${G}: ${gemist.length} (${pct(gemist.length, echt.length)}% gemist)`);
    const vals = rows.filter(r => filt(r) && mixw(r) != null && mixw(r) >= G && r.meet < G);
    console.log(`     model zei >= ${G} terwijl het minder was: ${vals.length} uren`);
  }
  // wat zegt het model als de meting echt 40 is? band 38-42, en de hele 40-plus
  for (const [lab2, lo, hi] of [["meting 38-42 kn", 38, 42], ["meting 40 kn en meer", 40, 999], ["meting 28-32 kn", 28, 32], ["meting 30 kn en meer", 30, 999]]) {
    const v = rows.filter(r => filt(r) && r.meet >= lo && r.meet < hi).map(mixw).filter(x => x != null);
    if (!v.length) { console.log(`  ${lab2.padEnd(22)} 0 uren`); continue; }
    const mm = rows.filter(r => filt(r) && r.meet >= lo && r.meet < hi && mixw(r) != null).map(r => r.meet);
    console.log(`  ${lab2.padEnd(22)} n ${String(v.length).padStart(5)}  mediaan model ${mediaan(v).toFixed(1)} kn  (mediaan meting ${mediaan(mm).toFixed(1)} kn)  gemiddeld model ${gem(v).toFixed(1)}`); }
  // En andersom, en dat is de enige richting die de paginalezer echt ziet: het MODEL zegt X,
  // wat woei er dan? (Op de gemeten wind sorteren pikt de uren met de grootste modelmisser eruit
  // en overdrijft daardoor de verhouding. Op het MODEL sorteren doet dat niet.)
  console.log(`  -- het model zegt X, wat werd er gemeten --`);
  for (const b of BANDEN) {
    const rs = rows.filter(r => filt(r) && mixw(r) != null && mixw(r) >= b[0] && mixw(r) < b[1]);
    if (!rs.length) { console.log(`  model ${b[2].padEnd(8)} 0 uren`); continue; }
    const v = rs.map(r => r.meet / mixw(r)), c = ci95(v);
    console.log(`  model ${b[2].padEnd(8)} n ${String(rs.length).padStart(5)}  mediaan meting ${mediaan(rs.map(r => r.meet)).toFixed(1)} kn  gemiddelde meting ${gem(rs.map(r => r.meet)).toFixed(1)}  verhouding ${c ? `${c.m.toFixed(3)} [${c.lo.toFixed(3)};${c.hi.toFixed(3)}]` : "-"}${c && c.breedte > 0.15 ? "  <- interval te breed" : ""}`); }
}

// ── 6. houdt de vlakke verhouding stand, en doet een optelling het net zo goed? ──
console.log(`\n=== 6. Een vaste factor of een vaste optelling: wat blijft er per band over? ===`);
for (const [lab, filt] of [["Hoek van Holland", r => r.code == "330"], ["IJmuiden", r => r.code == "225"], ["piers samen", r => r.soort == "pier"]]) {
  const d = rows.filter(filt).map(r => [mixw(r), r.meet]).filter(x => x[0] != null);
  if (d.length < 100) continue;
  let bA = null, bF = null;
  for (let a = 0; a <= 8; a += 0.1) { const f = gem(d.map(x => Math.abs(x[0]+a - x[1]))); if (!bA || f < bA[1]) bA = [a, f]; }
  for (let f = 1; f <= 1.6; f += 0.01) { const e = gem(d.map(x => Math.abs(x[0]*f - x[1]))); if (!bF || e < bF[1]) bF = [f, e]; }
  console.log(`\n-- ${lab} -- n ${d.length}  fout ruw ${gem(d.map(x => Math.abs(x[0]-x[1]))).toFixed(2)} kn`);
  console.log(`   beste optelling +${bA[0].toFixed(1)} kn -> fout ${bA[1].toFixed(2)} kn   |   beste factor x${bF[0].toFixed(2)} -> fout ${bF[1].toFixed(2)} kn   |   winnaar: ${bA[1] <= bF[1] ? "optelling" : "factor"}`);
  console.log("   rest-bias per band (model min meting, in kn), n erbij:");
  console.log("   " + "correctie".padEnd(20) + BANDEN.map(b => b[2].padStart(14)).join(""));
  for (const [l2, fn] of [["geen", v => v], [`optelling +${bA[0].toFixed(1)}`, v => v + bA[0]], [`factor x${bF[0].toFixed(2)}`, v => v * bF[0]]])
    console.log("   " + l2.padEnd(20) + BANDEN.map(b => { const dd = rows.filter(r => filt(r) && r.meet >= b[0] && r.meet < b[1]).map(r => [mixw(r), r.meet]).filter(x => x[0] != null);
      return (dd.length ? `${gem(dd.map(x => fn(x[0]) - x[1])).toFixed(1)}(${dd.length})` : `-(0)`).padStart(14); }).join(""));
}

// ── 7. vlagen ─────────────────────────────────────────────────────────────
console.log(`\n=== 7. Vlagen: model-vlaag tegen KNMI FX (de hoogste vlaag in dat uur) ===`);
const verhV = rs => { const v = rs.map(r => { const m = mixv(r); return (m == null || m < MIN_MODEL || r.fx == null) ? null : r.fx/m; }).filter(x => x != null); return { v, c: ci95(v) }; };
for (const [lab, filt] of [["Hoek van Holland", r => r.code == "330"], ["IJmuiden", r => r.code == "225"], ["De Kooy", r => r.code == "235"], ["piers samen", r => r.soort == "pier"]]) {
  console.log(`\n-- ${lab} -- (band op de GEMETEN vlaag FX)`);
  for (const b of BANDEN) { const x = verhV(rows.filter(r => filt(r) && r.fx != null && r.fx >= b[0] && r.fx < b[1]));
    const breed = x.c && x.c.breedte > 0.15 ? "   <- interval te breed, bewijst niets" : (x.c ? "" : "   <- geen uren");
    console.log(`  ${b[2].padEnd(8)}${toonVerh(x)}${breed}`); }
  const d = rows.filter(r => filt(r) && r.fx != null).map(r => [mixv(r), r.fx]).filter(x => x[0] != null);
  if (d.length > 100) { let bA = null, bF = null;
    for (let a = 0; a <= 10; a += 0.1) { const f = gem(d.map(x => Math.abs(x[0]+a - x[1]))); if (!bA || f < bA[1]) bA = [a, f]; }
    for (let f = 1; f <= 1.6; f += 0.01) { const e = gem(d.map(x => Math.abs(x[0]*f - x[1]))); if (!bF || e < bF[1]) bF = [f, e]; }
    console.log(`  samen: n ${d.length}  fout ruw ${gem(d.map(x => Math.abs(x[0]-x[1]))).toFixed(2)}  beste optelling +${bA[0].toFixed(1)} -> ${bA[1].toFixed(2)}  beste factor x${bF[0].toFixed(2)} -> ${bF[1].toFixed(2)}  winnaar: ${bA[1] <= bF[1] ? "optelling" : "factor"}`);
    const w = verhV(rows.filter(r => filt(r) && WINTER.includes(r.maand))), z = verhV(rows.filter(r => filt(r) && !WINTER.includes(r.maand)));
    console.log(`  vlaagverhouding winter ${toonVerh(w).trim()}   zomer ${toonVerh(z).trim()}`); }
}
console.log(`\nklaar. Alle getallen hierboven komen uit deze run; niets is doorgetrokken of geschat.`);
