/* Kiteweer — vijf niveaus, één kleur per niveau, verder geen kleur.
   perfect · goed · matig · te weinig · aflandig
   Uur-voor-uur wind, zon en golven live uit Open-Meteo (laad.js), terugval uur.js.
   Stroming uit stroom.js (Rijkswaterstaat, elke nacht ververst).
   Spots en veilige windsectoren uit data.js: Arthurs curatie, die verloopt niet. */

window.KWU_READY.then(function () {
  "use strict";

  /* Je grootste kite is een instelling, want hij bepaalt alles: bij welke wind je kunt beginnen,
     waar de kleur begint, de streep in de weekbalk, en de sessiekans. Wie een 17 m heeft, kan bij
     minder wind al het water op; wie alleen een 9 m heeft, moet wachten. */
  function GROOT() { return st.groot; }
  /* Twee grenzen boven "perfect". VEEL = 30: daarboven is het geen perfecte dag meer maar wel een
     sessie, jij kite tot 40 met een kleine kite (Daniel, 11-09-2026). TEVEEL = 40: daarboven telt
     een doorrekening niet meer als "je kunt kiten", anders zegt de pagina 100% bij 45 kn storm. */
  var VEEL = 30, TEVEEL = 40;
  var DAGL = ["zondag","maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag"];
  var DAGK = ["zo","ma","di","wo","do","vr","za"];
  var KOMPAS = ["N","NNO","NO","ONO","O","OZO","ZO","ZZO","Z","ZZW","ZW","WZW","W","WNW","NW","NNW"];

  var BOARDS = { twintip:1, directional:0.8 };
  var ARTHUR = KWU.modellen.filter(function (m) { return m.arthur; }).map(function (m) { return m.id; });
  var DAJK = KWU.modellen.filter(function (m) { return m.tijd; }).map(function (m) { return m.id; });
  /* Mixen: "dajk" = de DAJK-mix van docs/dajk-mix.md (fijn zolang het reikt, dan grof met optelling, ARPEGE, kans uit ensembles);
     "ajk" = Arthurs 50/50; "dajk-oud" = de oude DAJK zonder optelling, alleen nog in code (localStorage kiteweer.mix) voor vergelijking. */
  /* Spot-optelling voor de grove modellen in de DAJK-mix: aan het water lezen ze 3–4 kn te laag,
     op een landmast niet (De Kooy). Gemeten 60 dagen op Hoek van Holland (+3) en IJmuiden (+4), docs/dajk-mix.md. */
  var OPTELLING = { standaard: 3, noordpier: 4, zuidpier: 4, wijkaanzee: 4 };
  function optelling() { return OPTELLING[st.spot] != null ? OPTELLING[st.spot] : OPTELLING.standaard; }
  /* groot = je grootste kite in meters. 12 is de standaard omdat dat de maat is die de meeste
     mensen als grootste hebben; Daniel heeft 13 en dat staat in zijn browser opgeslagen. */
  var st = { board:"twintip", kg:85, groot:12, spot:"kijkduin", dag:0, t:null, modellen:DAJK.slice(), mix:"dajk" };
  try { var bewaard = JSON.parse(localStorage.getItem("kiteweer") || "{}");
    ["board","kg","groot","spot","modellen","mix"].forEach(function (k) { if (bewaard[k] != null) st[k] = bewaard[k]; });
    if (bewaard.v !== 3) { st.mix = "dajk"; st.modellen = DAJK.slice(); }   // eenmalig: iedereen naar de nieuwe DAJK-mix
    if (!KW.spots.some(function (s) { return s.id === st.spot; })) st.spot = KW.spots[0].id;
    st.modellen = st.modellen.map(function (m) { return m === "ecmwf_ifs025" ? "ecmwf_ifs" : m; });   // oude opgeslagen keuze: 25 km → 9 km
    st.modellen = st.modellen.filter(function (m) { return KWU.modellen.some(function (x) { return x.id === m; }); }); if (!st.modellen.length) st.modellen = ARTHUR.slice();
  } catch (e) {}
  function bewaar() { try { localStorage.setItem("kiteweer", JSON.stringify({ v:3, board:st.board, kg:st.kg, groot:st.groot, spot:st.spot, modellen:st.modellen, mix:st.mix })); } catch (e) {} }
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) {
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); };
  function kompas(d) { return KOMPAS[Math.round(((d%360)+360)%360/22.5)%16]; }
  function spot() { return KW.spots.filter(function (s) { return s.id === st.spot; })[0]; }
  function uurStr(t) { return t.slice(11,13) + ":00"; }
  function dagStr(t) { var d = new Date(t); return DAGK[d.getDay()] + " " + d.getDate() + "/" + (d.getMonth()+1); }
  function dagLang(t) { var d = new Date(t); return DAGL[d.getDay()] + " " + d.getDate() + "/" + (d.getMonth()+1); }
  function hoekTussen(a, b) { return Math.abs(((a - b + 540) % 360) - 180); }

  /* ── de vijf niveaus ────────────────────────────────
     Veilig = windrichting valt in een veilige sector van DEZE spot.
     Aflandig telt alleen als er genoeg wind staat om te gaan. */
  function inSector(dir, v) { var d = ((dir%360)+360)%360; return v[0] <= v[1] ? (d >= v[0] && d <= v[1]) : (d >= v[0] || d <= v[1]); }
  function veilig(s, dir) { return s.vensters.some(function (v) { return inSector(dir, v); }); }
  /* De vier oordelen hangen niet aan vaste knopen maar aan hoe hard je grootste kite trekt:
     druk = die maat gedeeld door de ideale maat bij die wind. Bij 85 kg twintip met een 13 m komen
     de oude, op Daniels sessies geijkte grenzen er precies weer uit: 12 · 14 · 19 kn.
     Zonder dit klopte het niet meer zodra je kite anders was: met een 9 m was alles boven de
     ondergrens meteen "perfect", met een 13 m bestond de band "matig" niet meer (nagerekend 11-09).
     De bovengrenzen blijven vaste knopen, want te hard is een kwestie van veiligheid, niet van maat. */
  function druk(kn) { return GROOT() / ideaal(kn); }
  /* Eén ondergrens voor de hele pagina: druk 0,97, de wind waarbij je grootste kite trekt.
     Eerst had 12–14 kn nog de naam "matig" terwijl de sessiekans daar 0% gaf; dat sprak zichzelf
     tegen, dus onder die grens heet alles nu gewoon te weinig wind. "Matig" is voortaan alleen
     nog te véél wind: boven 30 kn kan het, maar met de kleine kite. */
  function band(kn) {
    var r = druk(kn);
    if (kn > VEEL) return "matig";
    return r < 0.97 ? "weinig" : r < 1.32 ? "goed" : "perfect";
  }
  /* Bij welke wind een bepaalde druk hoort: voor de legenda en de uitleg. */
  function knBij(r) { return Math.round(r * 2.2 * st.kg * BOARDS[st.board] / GROOT()); }
  /* Doorlopende kleur voor staaf en vlagen: geel (12) → groen (19) → donkergroen (24). Labels blijven vijf. */
  function knKleur(kn, n) {
    if (n === "weinig" || n === "aflandig") return KLEUR[n];
    var g = genoegKn();
    var t = Math.max(0, Math.min(1, (kn - g) / 10));                // 14 → 0 (oker), 24 → 1 (groen)
    var h = 42 + t * 115, sat = 62 - t * 10, l = 44 - t * 16;        // 42 = oker, 157 = groen
    return "hsl(" + h.toFixed(0) + " " + sat.toFixed(0) + "% " + l.toFixed(0) + "%)";
  }
  function niveau(u) { if (!u) return "weinig"; if (!veilig(spot(), u.dir) && u.kn >= genoegKn()) return "aflandig"; return band(u.kn); }
  /* "matig" heet op de pagina "hard": het is de band boven 30 kn. Hard is geen slechte dag, het is
     een andere dag, met een kleine kite (Daniel, 12-09). De interne naam blijft matig, want die
     staat in de kleuren en in de sorteervolgorde van de labels. */
  var WOORD = { perfect:"perfect", goed:"goed", matig:"hard", weinig:"te weinig wind", aflandig:"aflandig" };
  var RANG  = { perfect:0, goed:1, matig:2, weinig:3, aflandig:4 };
  var KLEUR = { perfect:"#0E7A54", goed:"#3E9B6E", matig:"#C08315", weinig:"#A9A096", aflandig:"#CE4A1F" };
  function tint(n) { return "var(--" + n + ")"; }
  function tintV(n) { return "var(--" + n + "-v)"; }

  /* ── wind = mediaan over de aangevinkte modellen ──────
     Elk model apart opgehaald; hier per uur de middelste waarde. Richting als cirkelgemiddelde.
     Valt een model buiten zijn horizon (null), dan telt het niet mee. Niets aangevinkt = basisreeks. */
  var cache = { key:null, uren:null };
  var MODEL = {}; KWU.modellen.forEach(function (m) { MODEL[m.id] = m; });
  /* Gewicht per model zoals Arthur het doet: eerst zijn skill-gewicht binnen de klasse, dan wegen de
     klassen regionaal/globaal 50/50, zodat vier fijne modellen niet vanzelf de globale overstemmen. */
  /* Klassegewicht: AJK = 50/50 (zijn besluit, geen meting). DJK = alleen fijn zolang een fijn model reikt,
     daarna grof. Getoetst op 30-08 t/m 05-09 tegen KNMI Hoek van Holland (verifieer.mjs): fijn-mix zat
     1,3 kn te laag, AJK 3,0, grof 3,8. Eén week, één station op een pier: aanwijzing, geen bewijs. */
  function gewichten(ids) {
    var som = { regionaal:0, globaal:0 }; ids.forEach(function (id) { som[MODEL[id].klasse] += MODEL[id].w; });
    var cw = { regionaal:0.5, globaal:0.5 };
    if (st.mix === "dajk" || st.mix === "dajk-oud") cw = { regionaal:1, globaal:0 };
    if (!som.regionaal) cw = { regionaal:0, globaal:1 }; else if (!som.globaal) cw = { regionaal:1, globaal:0 };
    return ids.map(function (id) { var m = MODEL[id]; return (m.w / som[m.klasse]) * cw[m.klasse]; });
  }
  function gewMediaan(vals, ws) {
    var p = vals.map(function (v, i) { return [v, ws[i]]; }).sort(function (a,b) { return a[0]-b[0]; }), tot = 0, acc = 0;
    p.forEach(function (x) { tot += x[1]; });
    for (var i = 0; i < p.length; i++) { acc += p[i][1]; if (acc >= tot / 2) return p[i][0]; }
    return p[p.length-1][0];
  }
  function uren() {
    var key = st.spot + "|" + st.mix + "|" + st.modellen.join(",");
    if (cache.key === key) return cache.uren;
    var sp = KWU.spots[st.spot], s = spot();
    cache.uren = sp.uren.map(function (u, i) {
      var ids = st.modellen.filter(function (m) { return sp.modellen[m] && sp.modellen[m][i]; });
      if (!ids.length) return st.modellen.length ? null : Object.assign({}, u, { nModellen:0 });   // buiten horizon van alles wat aanstaat: geen uur
      var off = st.mix === "dajk" ? optelling() : 0;
      var rows = ids.map(function (m) { var r = sp.modellen[m][i]; return off && MODEL[m].off ? [r[0] + off, r[1] + off, r[2]] : r; }), ws = gewichten(ids);
      /* kans uit de ensembles: deel van de leden (na de optelling) dat rijdbaar geeft; alleen in de DAJK-mix, alleen wind */
      var ens = null, genoeg = genoegKn();
      if (st.mix === "dajk" && sp.ens) { ens = {}; Object.keys(sp.ens).forEach(function (e) { var v = sp.ens[e][i]; if (!v) return;
        ens[e] = Math.round(v.filter(function (x) { return x + off >= genoeg && x + off <= TEVEEL; }).length / v.length * 100); }); if (!Object.keys(ens).length) ens = null; }
      var sx = 0, sy = 0, ja = 0; rows.forEach(function (r, j) {
        sx += ws[j]*Math.cos(r[2]*Math.PI/180); sy += ws[j]*Math.sin(r[2]*Math.PI/180);
        if (r[0] >= genoeg && r[0] <= TEVEEL && veilig(s, r[2])) ja += ws[j];                       // Arthurs gate, per model één stem
      });
      var kns = rows.map(function (r) { return r[0]; });
      return Object.assign({}, u, { kn:gewMediaan(kns, ws), vl:gewMediaan(rows.map(function (r) { return r[1]; }), ws),
        dir:Math.round((Math.atan2(sy, sx)*180/Math.PI + 360) % 360), nModellen:rows.length, nJa:rows.filter(function (r) { return r[0] >= genoeg && r[0] <= TEVEEL && veilig(s, r[2]); }).length,
        kans:Math.round(ja*100), knLo:Math.min.apply(null,kns), knHi:Math.max.apply(null,kns), ens:ens, off:off });
    });
    cache.key = key; return cache.uren;
  }

  /* ── dagen: alleen de uren tussen zon op en zon onder ── */
  function dagen() {
    var sp = KWU.spots[st.spot], map = {}, volg = [];
    uren().forEach(function (u) {
      if (!u) return;
      var k = u.t.slice(0,10), z = sp.zon.filter(function (z) { return z.d === k; })[0];
      if (!z) return;
      var h = u.t.slice(11,16);
      if (h < z.op.slice(0,3) + "00" || h > z.onder) return;   // eerste vol uur na zon op t/m laatste uur voor zon onder
      if (!map[k]) { map[k] = { k:k, uren:[], zon:z }; volg.push(map[k]); }
      map[k].uren.push(u);
    });
    return volg;
  }
  function huidigeDag() { var ds = dagen(); return ds[Math.min(st.dag, ds.length-1)]; }

  /* Het cijfer van een venster, één keer gerekend en daarna bewaard: de volgorde van de vensters en
     de keuze van de beste dag hangen eraan, en dat zijn allebei lijstjes die we vaak doorlopen. */
  function scoreVan(v) { if (v._s == null) v._s = cijfer(v).score; return v._s; }
  /* Alle aaneengesloten rijdbare vensters (vanaf 12 kn, veilige hoek), beste eerst (op cijfer, dan lengte).
     Label = het niveau dat het vaakst voorkomt; een venster van 14-14-14-15-14 heet dus "matig", maar
     staat er wél: 14 kn met een grote kite is een sessie (Daniel, 2026-09-06). */
  function vensters(us, zon) {
    var alle = [], nu = null;
    us.forEach(function (u) {
      var n = niveau(u);
      if (n === "perfect" || n === "goed" || n === "matig") { if (!nu) { nu = []; alle.push(nu); } nu.push(u); } else nu = null;
    });
    return alle.map(function (v) {
      var kns = v.map(function (u) { return u.kn; }), vls = v.map(function (u) { return u.vl; });
      var tel = { perfect:0, goed:0, matig:0 }; v.forEach(function (u) { tel[niveau(u)]++; });
      var n = ["perfect","goed","matig"].sort(function (a,b) { return tel[b] - tel[a] || RANG[a] - RANG[b]; })[0];
      return { uren:v, n:n, lo:Math.min.apply(null,kns), hi:Math.max.apply(null,kns), vlLo:Math.min.apply(null,vls), vlHi:Math.max.apply(null,vls),
        tekst: uurStr(v[0].t) + "–" + (zon && (+v[v.length-1].t.slice(11,13)+1) + ":00" > zon.onder ? zon.onder : (+v[v.length-1].t.slice(11,13)+1) + ":00") };
      /* Sorteren op het cijfer, niet op het label. Op het label won een dag van 16 kn ("goed") het
         van een dag van 33 kn ("hard"), terwijl die tweede een 8 scoort en de eerste een 7: hard
         waaien is geen mindere dag, het vraagt een kleinere kite (Daniel, 12-09). */
    }).sort(function (a,b) { return scoreVan(b) - scoreVan(a) || b.uren.length - a.uren.length; });
  }
  function top(us) { return us.reduce(function (a,u) { return u.kn > a.kn ? u : a; }); }
  function dagOordeel(d) {
    var ws = vensters(d.uren, d.zon), b = ws.length ? top(ws[0].uren) : top(d.uren);
    return { ws:ws, v:ws[0] || null, b:b, n:ws.length ? ws[0].n : niveau(b) };
  }
  /* Hoeveel fijne modellen nog reiken midden op de dag (0 = alles grof). */
  function fijnBij(d) { var sp = KWU.spots[st.spot], u = d.uren[Math.floor(d.uren.length/2)], i = sp.uren.findIndex(function (x) { return x.t === u.t; });
    return st.modellen.filter(function (m) { return MODEL[m].klasse === "regionaal" && sp.modellen[m] && sp.modellen[m][i]; }).length; }
  /* Kans op kitewind per dag uit de ensembles: gemiddelde over de daglichturen, per ensemble. Alleen DAJK-mix. */
  function dagKans(d) {
    var som = {}, n = {};
    d.uren.forEach(function (u) { if (!u.ens) return; Object.keys(u.ens).forEach(function (e) { som[e] = (som[e] || 0) + u.ens[e]; n[e] = (n[e] || 0) + 1; }); });
    var ks = Object.keys(som); if (!ks.length) return null;
    var out = {}; ks.forEach(function (e) { out[e] = Math.round(som[e] / n[e]); }); return out;
  }
  /* Eén getal in plaats van "GFS 23% · ECMWF 81%". Welk rekencentrum het zei zegt jou niks; hoe
     zeker ze zijn wel. Lopen ze meer dan 20 punten uiteen, dan is die onenigheid zelf het nieuws
     en tonen we het bereik. */
  function kansTekst(k) {
    if (!k) return "";
    var v = ["gfs", "ecmwf"].map(function (e) { return k[e]; }).filter(function (x) { return x != null; });
    if (!v.length) return "";
    var lo = Math.min.apply(null, v), hi = Math.max.apply(null, v);
    return hi - lo > 20 ? lo + "–" + hi + "%" : Math.round((lo + hi) / 2) + "%";
  }
  function indicatieTekst(i, d) { if (fijnBij(d)) return ""; var k = kansTekst(dagKans(d)); return " · indicatie" + (k ? " · sessiekans " + k : ", alleen grove modellen"); }
  /* Gekozen uur; standaard het eerste kitebare uur van de dag, anders het hardste. */
  function gekozen() {
    var d = huidigeDag(), u = d.uren.filter(function (x) { return x.t === st.t; })[0];
    if (u) return u;
    var o = dagOordeel(d); u = o.v ? o.v.uren[0] : o.b; st.t = u.t; return u;
  }
  /* Stroming bij een uur, uit stroom.js: elke nacht vers bij Rijkswaterstaat opgehaald
     (gen-stroom.mjs, zie docs/stroom.md), 35 van de 64 spots. Vorm: { stroom: { kn, naar } }.
     De oude 3-uursblokken uit data.js zijn eruit: die liepen af op 11-09 21:00 en konden daarna
     nooit meer iets teruggeven. */
  function blokBij(t) { return versStroom(t); }
  /* Dichtstbijzijnde meting binnen het uur; verder weg dan een uur telt niet, dan is de reeks op. */
  function versStroom(t) {
    var K = window.KWS; if (!K || !K.spots || !K.punten) return null;
    var rij = K.punten[K.spots[st.spot]]; if (!rij || !rij.length) return null;
    var ms = new Date(t).getTime(), beste = null;
    for (var i = 0; i < rij.length; i++) {
      var d = Math.abs(new Date(rij[i][0]).getTime() - ms);
      if (beste === null || d < beste.d) beste = { r:rij[i], d:d };
    }
    return beste && beste.d <= 3600e3 ? { t:t, stroom:{ kn:beste.r[1], naar:beste.r[2] } } : null;
  }

  /* ── stroming, de regel van Arthur (SPEC §9) ──────────
     c = stroom x cos(hoek tussen stroom-naar en wind-vandaan).
     Positief = tegen de wind in = goed: gratis hoogte + extra druk in de kite (vooral onder 20 kn).
     Negatief = mee met de wind: haalt druk uit je kite, je zakt af, wel vlakker water. */
  function stroomC(b, dir) {
    if (!b || !b.stroom || b.stroom.kn < 0.08) return 0;
    return b.stroom.kn * Math.cos(hoekTussen(b.stroom.naar, dir) * Math.PI / 180);
  }
  function stroomOordeel(b, u) {
    var c = stroomC(b, u.dir);
    if (!b || !b.stroom) return { niveau:"weinig", kop:"Stroming onbekend", punten:["geen stroombron voor dit uur"] };
    var kn = b.stroom.kn, m = Math.round(Math.abs(c) * 1852);
    if (Math.abs(c) < 0.15) return { niveau:"goed", kop:"Stroom dwars of stil, " + kn.toFixed(1) + " kn", punten:["maakt voor je hoogte weinig uit", "je blijft ongeveer waar je bent"] };
    if (c > 0) return { niveau: c > 2 ? "matig" : "perfect", kop:"Stroom tegen de wind in, +" + c.toFixed(1) + " kn",
      punten:["gratis hoogte: het water draagt je " + m + " m per uur bovenwinds", "+" + c.toFixed(1) + " kn extra druk in je kite" + (u.kn < 20 ? ", precies wat je bij " + u.kn + " kn wilt" : ""), "wel wat steiler, hakkeriger water" + (c > 2 ? "; boven 2 kn lastig terugkomen" : "")] };
    return { niveau: c < -1.5 ? "aflandig" : c < -0.5 ? "matig" : "goed", kop:"Stroom mee met de wind, " + c.toFixed(1) + " kn",
      punten:["haalt " + Math.abs(c).toFixed(1) + " kn druk uit je kite", "je zakt " + m + " m per uur af, dus terugkruisen", "wel vlakker water"] };
  }
  /* ── golven in gewone woorden ── */
  function golfOordeel(g) {
    if (!g) return { niveau:"weinig", kop:"Golven onbekend", punten:[] };
    /* Chop en deining tellen samen als energie (h² = chop² + deining²), maar betekenen iets anders:
       chop (3–4 s) = hobbelig, remt en vermoeit; deining (≥6 s) = lange golven, bruikbaar als schans. */
    var h = g.m, ch = g.chop || 0, sw = g.swell || 0, p = [];
    var chopN = ch < 0.3 ? "perfect" : ch < 0.7 ? "goed" : ch < 1.2 ? "matig" : "aflandig";
    var kop = ch < 0.3 ? "Vlak water" : ch < 0.7 ? "Beetje chop" : ch < 1.2 ? "Hobbelig" : "Ruig";
    p.push(ch < 0.3 ? "nauwelijks windchop, glad om te rijden" : "windchop " + ch.toFixed(1) + " m om de " + g.chopS + " s: " + (ch < 0.7 ? "kleine hobbels, prima" : ch < 1.2 ? "hakkerig, kost snelheid en benen" : "steile korte golven, vermoeiend"));
    if (sw >= 0.3 && g.swellS >= 6) p.push("deining " + sw.toFixed(1) + " m uit " + kompas(g.swellDir) + " om de " + g.swellS + " s: lange glooiende golven, mooie schansen om te springen");
    else if (sw >= 0.3) p.push("deining " + sw.toFixed(1) + " m om de " + g.swellS + " s: te kort om echt als schans te dienen");
    else p.push("geen deining, alleen wat de wind zelf maakt");
    p.push("samen " + h.toFixed(1) + " m");
    return { niveau: chopN === "aflandig" ? "matig" : chopN, kop: kop + ", " + h.toFixed(1) + " m", punten:p };
  }

  /* ── kitemaat ──────────────────────────────────────
     ideaal = 2,2 x kg / knopen x boardfactor. Per kite uit JOUW quiver zeggen we hoe hij staat. */
  function ideaal(kn) { return 2.2 * st.kg / kn * BOARDS[st.board]; }
  /* Wind waarbij je grootste kite net trekt: 2,2 x gewicht / die maat. Bij 85 kg twintip met een
     13 m is dat 14 kn; met een 17 m 11 kn. Daaronder sta je stil, ook met alles uitgerold. Dit is
     de streep in de weekbalk, het punt waar de kleur begint, en de ondergrens van de sessiekans. */
  function genoegKn() { return Math.round(0.97 * 2.2 * st.kg * BOARDS[st.board] / GROOT()); }
  function staat(maat, kn) {
    var r = maat / ideaal(kn);
    // Geijkt op Daniels sessies: 10 m bij 23 kn (ratio 1,23) voelde "lekker powered", niet over.
    return r > 1.35 ? "over" : r > 1.15 ? "lekker powered" : r < 0.80 ? "te klein" : r < 0.90 ? "iets under" : "goed";
  }
  /* Welke maat past bij een windbereik: afgerond op hele meters, hoog naar laag. */
  /* Maat op de gemiddelde wind. Trekkracht groeit met wind², dus bij vlaag/wind ≥ 1,5 één maat kleiner.
     Geijkt op één sessie (30-08, 19 kn → 10 m bij 85 kg): medium zekerheid. */
  /* Nooit een maat adviseren die je niet hebt: je grootste staat in de kop. Komt de berekening hoger
     uit, dan is er simpelweg te weinig wind en staat er een streepje in de tabel. */
  function kiteAdvies(kn, vl) {
    var m = Math.round(ideaal(kn)), vlagerig = vl / kn >= 1.5;
    if (m > GROOT()) return null;
    return { maat:m, klein:vlagerig ? Math.max(5, m - 2) : null, vlagerig:vlagerig };
  }
  function kiteBereik(lo, hi, vl) {
    var a = kiteAdvies(hi, vl), b = kiteAdvies(lo, vl);
    if (!a) return "te weinig wind voor je " + GROOT() + " m";     // zelfs de hardste wind trekt je grootste kite niet
    if (!b) b = { maat: GROOT() };                                 // onderkant valt buiten je maten: hou het bij je grootste
    var tekst = a.maat === b.maat ? a.maat + " m" : a.maat + "–" + b.maat + " m";
    return a.vlagerig ? tekst + " (" + a.klein + " m kan, de vlagen dragen je)" : tekst;
  }
  function vlMax(us) { return Math.max.apply(null, us.map(function (u) { return u.vl; })); }

  /* ── de cijfercurve ───────────────────────────────
     Het startcijfer hangt aan de druk (jouw grootste kite gedeeld door de maat die bij die wind
     hoort), niet aan vaste knopen. Zo verschuift de hele curve mee als je zwaarder wordt of een
     andere kite koopt: bij meer gewicht heb je meer wind nodig voor dezelfde druk, en dus schuift
     je tien mee naar rechts. Daarom zit gewicht al in het cijfer; er is geen aparte gewichtspost.
     De punten hieronder zijn Daniels eigen band: bij 85 kg met een 13 m is 20 tot 30 kn ideaal
     (12-09), 14 kn is net trekken, boven de 35 kn is het overleven. Tussen twee punten loopt het
     cijfer vloeiend door, zodat een knoop verschil nooit een heel punt scheelt.
     GEEN sessielog: dit is geijkt op gesprek en twee sessies, niet op ingevulde cijfers. */
  var CURVE = [[0.80, 2], [0.97, 4.5], [1.15, 6], [1.39, 8], [1.60, 9], [2.09, 9], [2.40, 7.5], [2.78, 6]];
  function startCijfer(r) {
    if (r <= CURVE[0][0]) return CURVE[0][1];
    for (var i = 1; i < CURVE.length; i++) {
      if (r <= CURVE[i][0]) {
        var a = CURVE[i-1], b = CURVE[i];
        return a[1] + (b[1] - a[1]) * (r - a[0]) / (b[0] - a[0]);
      }
    }
    return 5;                                                      // boven 40 kn-druk: alleen nog survival
  }
  /* Hetzelfde in woorden, zodat de uitleg en het cijfer nooit uit elkaar lopen. */
  function drukWoord(r) {
    return r < 1.05 ? "wind waarbij je kite net trekt" : r < 1.20 ? "je gaat vooruit, niet meer"
      : r < 1.39 ? "prettige wind" : r < 2.10 ? "lekker powered, jouw band" : "veel druk, maat kleiner";
  }
  /* ── cijfer voor een venster: wind, stabiliteit, stroming, golven, lengte ── */
  function cijfer(v) {
    var us = v.uren, n = us.length, pl = [], mn = [], som = [];
    /* Het startcijfer komt uit de druk, niet uit het woord "goed" of "perfect". Eerst kreeg een
       venster van 14 kn een 7 omdat het "goede wind" heette, terwijl je grootste kite daar net
       trekt (Daniel, 12-09: "high grade for little wind"). Nu loopt het cijfer met de druk mee en
       piekt het waar je lekker powered staat. */
    var rGem = us.reduce(function (a, u) { return a + druk(u.kn); }, 0) / n;
    var knGem = us.reduce(function (a, u) { return a + u.kn; }, 0) / n;
    var start = startCijfer(rGem);
    /* Boven 30 kn is het nog steeds kiten, maar dan beslissen de omstandigheden en niet de wind:
       vlagen, stroom en golven tellen daar anderhalf keer zo zwaar mee (Daniel, 12-09). */
    var zwaar = knGem > VEEL ? 1.5 : 1;
    var score = start;
    var tel = function (d, tekst) { if (d < 0) d = Math.round(d * zwaar * 2) / 2;
      score += d; som.push((d > 0 ? "+ " : "− ") + Math.abs(d).toString().replace(".", ",") + " " + tekst); (d > 0 ? pl : mn).push(tekst); };
    var vl = us.reduce(function (a,u) { return a + (u.vl - u.kn); }, 0) / n;
    if (vl >= 10) tel(-1.5, "vlagerig, vlagen " + Math.round(vl) + " kn boven de wind"); else if (vl < 6) tel(0.5, "stabiele wind");
    var c = us.reduce(function (a,u) { return a + stroomC(blokBij(u.t), u.dir); }, 0) / n;
    if (c > 0.3) tel(0.5, "stroom tegen de wind, gratis hoogte"); else if (c < -0.5) tel(-0.5, "stroom mee, je zakt af");
    var g = us.filter(function (u) { return u.golf; }); var gm = g.length ? g.reduce(function (a,u) { return a + u.golf.m; }, 0) / g.length : null;
    if (gm != null) { if (gm > 1.5) tel(-0.5, "flinke golven " + gm.toFixed(1) + " m"); else if (gm < 0.5) pl.push("vlak water"); }
    var mm = us.reduce(function (a,u) { return a + (u.mm||0); }, 0);
    if (mm >= 2) tel(-0.5, "regen, " + mm.toFixed(1) + " mm in het venster");
    /* Duur telde eerst hoogstens een punt, terwijl een uur rijden met op- en afbouwen voor één uur
       water een andere dag is dan een middag staan (Daniel, 12-09). */
    if (n >= 6) tel(1, n + " uur lang, een hele sessie"); else if (n >= 4) tel(0.5, n + " uur lang");
    else if (n <= 1) tel(-1.5, "slechts 1 uur, dat is opbouwen en weer afbouwen"); else if (n === 2) tel(-0.5, "kort, 2 uur");
    score = Math.max(1, Math.min(10, Math.round(score * 2) / 2));
    var st0 = (Math.round(start * 2) / 2).toString().replace(".", ",");
    return { score:score, plus:pl, min:mn, som: st0 + " voor " + drukWoord(rGem) + (som.length ? " " + som.join(" ") : "") + " = " + score.toString().replace(".", ","),
      een: (knGem > VEEL ? "Hard en goed powered, kleine kite" : rGem < 1.05 ? "Je kite trekt net, marginaal" : rGem < 1.20 ? "Je gaat vooruit, niet meer" : rGem < 1.39 ? "Prettige wind" : rGem < 2.10 ? "Lekker powered" : "Veel druk, maat kleiner") + (pl.length ? ", " + pl[0] : "") + (mn.length ? ", maar " + mn[0].split(",")[0] : "") };
  }

  /* weercode -> icoon + woord */
  function weer(c) {
    if (c === 0) return ["☀️","zon"]; if (c <= 2) return ["⛅","wolkjes"]; if (c === 3) return ["☁️","bewolkt"];
    if (c <= 49) return ["🌫️","mist"]; if (c <= 59) return ["🌦️","motregen"];
    if (c <= 69 || (c >= 80 && c <= 82)) return ["🌧️","regen"]; if (c <= 79 || c <= 86) return ["🌨️","sneeuw"];
    return ["⛈️","onweer"];
  }
  function druppels(mm) { return mm >= 5 ? 5 : mm >= 2.5 ? 4 : mm >= 1 ? 3 : mm >= 0.3 ? 2 : mm > 0 ? 1 : 0; }
  function pijl(deg, kl) {
    return '<svg class="wijzer" viewBox="0 0 16 16" style="transform:rotate(' + ((deg+180)%360) +
      'deg);color:' + (kl||"currentColor") + '" aria-hidden="true"><path d="M8 1.5l4.2 12-4.2-2.9L3.8 13.5z"/></svg>';
  }
  function hoekWoord(hoek, s, u) {
    var vl = u.vl - u.kn, vlaag = vl >= 10 ? "vlagerig: " + u.kn + " kn met uitschieters naar " + u.vl : vl >= 6 ? "wat vlagen, tot " + u.vl + " kn" : "stabiel, vlagen tot " + u.vl + " kn";
    var r = hoek > 90 ? (veilig(s, u.dir)
      ? { kop:"Aflandig op het gewone strand", punten:["op deze spot heb je een veilige kant (" + esc(s.vorm) + "), daar duwt de wind je naar het land"] }
      : { kop:"Aflandig", punten:["de wind blaast van het strand de zee op", "gaat je kite neer, dan drijf je weg van de kant"] })
      : hoek > 70 ? { kop:"Langs het strand", punten:["bijna evenwijdig aan de kust", "rijdbaar, maar hou afstand van de kant"] }
      : hoek >= 20 ? { kop:"Schuin op het strand", punten:["de mooiste hoek: je wordt naar de kant geduwd", "makkelijk heen en weer"] }
      : { kop:"Recht op het strand", punten:["de wind duwt je pal naar de kant", "veilig, maar opstarten en aanlanden is drukker werk"] };
    r.kop = u.kn + " kn uit " + kompas(u.dir) + ", " + r.kop.toLowerCase();
    r.punten.push(vlaag);
    return r;
  }

  /* ── kaart: echte luchtfoto van de spot, noorden boven ── */
  var kaart = null;
  function tekenScene() {
    var s = spot(), u = gekozen(), n = niveau(u), kl = KLEUR[n], ll = KWU.spots[s.id], d = huidigeDag();
    if (!kaart) {
      kaart = L.map("kaart", { zoomControl:false, dragging:false, scrollWheelZoom:false, doubleClickZoom:false,
        touchZoom:false, boxZoom:false, keyboard:false });
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom:18, attribution:"Esri" }).addTo(kaart);
    }
    kaart.setView([ll.lat, ll.lon], 15);
    setTimeout(function () { kaart.invalidateSize(); }, 50);

    var W = 900, H = 480, naar = (u.dir + 180) % 360;
    /* Pijl met donkere rand eronder, zodat hij op zand én op water leesbaar is. */
    function arrow(cx, cy, rot, len, kleur, dik, op) {
      var kop = -len/2, halo = "rgba(23,19,15,.55)";
      var vorm = function (kl, d) { return '<line x1="0" y1="' + (len/2) + '" x2="0" y2="' + (kop + dik*2) + '" stroke="' + kl + '" stroke-width="' + d + '" stroke-linecap="round"/>' +
        '<path d="M 0 ' + kop + ' L ' + (-dik*2.2) + ' ' + (kop + dik*2.6) + ' L ' + (dik*2.2) + ' ' + (kop + dik*2.6) + ' Z" fill="' + kl + '" stroke="' + kl + '" stroke-width="' + (d - dik) + '" stroke-linejoin="round"/>'; };
      return '<g transform="translate(' + cx + ',' + cy + ') rotate(' + rot + ')" opacity="' + (op||1) + '">' + vorm(halo, dik + 3) + vorm(kleur, dik) + '</g>';
    }
    var svg = "";
    for (var y = 60; y < H; y += 105) for (var x = 60; x < W; x += 120) svg += arrow(x, y, naar, 34 + u.kn*1.2, "#FFFFFF", 3.5, .9);
    svg += '<circle cx="' + W/2 + '" cy="' + H/2 + '" r="58" fill="rgba(23,19,15,.28)"/>' + arrow(W/2, H/2, naar, 96, kl, 9);
    var b = blokBij(u.t);
    if (b && b.stroom && b.stroom.kn >= 0.08) {
      var c = stroomC(b, u.dir);
      svg += '<circle cx="130" cy="' + (H-90) + '" r="46" fill="rgba(23,19,15,.35)"/>' + arrow(130, H-90, b.stroom.naar, 60 + Math.min(70, b.stroom.kn*70), "#4FC3F7", 8);

    }
    if (u.golf) {
      svg += '<circle cx="' + (W-130) + '" cy="' + (H-90) + '" r="46" fill="rgba(23,19,15,.35)"/>' + arrow(W-130, H-90, u.golf.dir + 180, 50 + Math.min(60, u.golf.m*40), "#F2D27A", 7);

    }
    svg += '<g transform="translate(' + (W-40) + ',44)"><circle r="18" fill="rgba(23,19,15,.45)"/><path d="M0 -12 L6 6 L0 2 L-6 6 Z" fill="#FFF"/><text y="26" text-anchor="middle" font-size="11" font-weight="700" fill="#FFF">N</text></g>';
    $("pijlen").innerHTML = svg;

    var hw = hoekWoord(hoekTussen(u.dir, s.onshore), s, u), so = stroomOordeel(b, u), go = golfOordeel(u.golf);
    var kt = kenteringTekst(d.uren); if (kt && so.punten) so.punten.push(kt);
    $("scenenote").textContent = "— " + dagStr(u.t) + " " + uurStr(u.t) + ", " + s.naam;
    var idx = d.uren.map(function (x) { return x.t; }).indexOf(u.t);
    $("schuif").max = d.uren.length - 1; $("schuif").value = Math.max(0, idx);
    $("schuiflabels").innerHTML = d.uren.map(function (x) { return '<i style="background:' + knKleur(x.kn, niveau(x)) + '"></i>'; }).join("");
    $("schuifuur").textContent = uurStr(u.t);
    var c0 = stroomC(b, u.dir);
    $("scenelabel").innerHTML = '<b style="color:' + kl + '">' + u.kn + ' kn</b><span><i class="pk wit"></i>wind uit ' + kompas(u.dir) + ', vlagen ' + u.vl + '</span>' +
      (b && b.stroom ? '<span><i class="pk blauw"></i>stroming ' + b.stroom.kn.toFixed(1) + ' kn ' + (c0 > 0.15 ? "tegen" : c0 < -0.15 ? "mee" : "dwars") + '</span>' : '') +
      (u.golf ? '<span><i class="pk geel"></i>golven ' + u.golf.m.toFixed(1) + ' m</span>' : '') +
      '<span>' + WOORD[n] + ((n !== "weinig" && n !== "aflandig") ? " · kite " + kiteBereik(u.kn, u.kn, u.vl) : "") + '</span>';
    $("sceneuitleg").innerHTML = [["Wind", n, hw], ["Stroming", so.niveau, so], ["Golven", go.niveau, go]].map(function (x) {
      return '<div class="oordeel" style="--tint:' + tint(x[1]) + ';--tint-v:' + tintV(x[1]) + '"><span class="okop">' + x[0] + '</span><b>' + x[2].kop + '</b><ul>' +
        x[2].punten.map(function (p) { return "<li>" + vet(p) + "</li>"; }).join("") + '</ul></div>'; }).join("");
  }

  // ── nu gemeten ───────────────────────────────────────
  function tekenNu() {
    var s = spot();
    if (!s.metingen || !s.metingen.length || st.dag !== 0 || Date.now() - new Date(s.metingen[0].ts).getTime() > 3*3600e3) { $("nu").hidden = true; return; }
    $("nu").hidden = false;
    $("nu").innerHTML = '<div class="nu-kop"><span class="nu-dot" aria-hidden="true"></span><b id="nu-h">Nu gemeten</b>' +
      '<span>' + new Date(s.metingen[0].ts).toLocaleTimeString("nl-NL",{hour:"2-digit",minute:"2-digit"}) + (s.verwachtNu != null ? " · model zei " + s.verwachtNu + " kn" : "") + ' · <a href="https://windmeting.nl" target="_blank" rel="noopener">live op windmeting.nl</a></span></div>' +
      '<div class="stations">' + s.metingen.map(function (m) {
        return '<div class="stn' + (m.standaard ? " hoofd" : "") + '"><span class="snaam">' + esc(m.naam) + ' <small>' + m.km + ' km</small></span>' +
          '<span class="swind">' + Math.round(m.wind) + '</span>' + (m.vlaag ? '<span class="sdir">/' + Math.round(m.vlaag) + '</span>' : '') +
          (m.dir != null ? '<span class="sdir">' + pijl(m.dir) + kompas(m.dir) + '</span>' : '') + '</div>'; }).join("") + '</div>';
  }

  // ── hero: de gekozen dag ─────────────────────────────
  function tekenHero() {
    var ds = dagen(), i = Math.min(st.dag, ds.length - 1), d = ds[i], s = spot(), o = dagOordeel(d);
    var beste = null, besteDag = null;
    ds.forEach(function (x) { var ox = dagOordeel(x);
      if (ox.v && (!beste || scoreVan(ox.v) > scoreVan(beste) || (scoreVan(ox.v) === scoreVan(beste) && ox.v.uren.length > beste.uren.length))) { beste = ox.v; besteDag = x; } });
    $("hero").style.setProperty("--tint", tint(o.n));
    $("kicker").textContent = s.naam + " · klik een kolom, de strandkaart volgt";
    var zon = "zon op " + d.zon.op + ", onder " + d.zon.onder;
    if (o.v) {
      $("verdict").textContent = o.ws.length + (o.ws.length === 1 ? " venster" : " vensters") + " · " + WOORD[o.n];
      $("vensterlijst").innerHTML = o.ws.map(function (w, j) {
        var c = cijfer(w);
        return '<button type="button" class="venster" data-venster="' + j + '" style="--tint:' + tint(w.n) + ';--tint-v:' + tintV(w.n) + '">' +
          '<span class="vt">' + w.tekst + '</span><span class="vk">' + w.lo + "–" + w.hi + ' kn <small>vlagen ' + w.vlLo + "–" + w.vlHi + '</small></span><span class="vkite">kite ' + kiteBereik(w.lo, w.hi, vlMax(w.uren)) + '</span>' +
          '<span class="vc">' + c.score.toString().replace(".", ",") + '</span><span class="veen">' + c.een + '</span><i class="info" aria-hidden="true">i</i></button>';
      }).join("");
      $("onderverdict").innerHTML = '<span class="flauw">' + zon + indicatieTekst(i, d) + '</span>';
    } else {
      $("verdict").textContent = o.n === "aflandig" ? "Aflandig, niet gaan" : o.n === "matig" ? "Veel wind, " + o.b.kn + " kn" : "Te weinig wind";
      $("vensterlijst").innerHTML = "";
      $("onderverdict").innerHTML = (o.n === "matig" ? "veel wind, kleine kite (" + kiteBereik(o.b.kn, o.b.kn, o.b.vl) + "), rond " + uurStr(o.b.t) : "hoogste " + o.b.kn + " kn om " + uurStr(o.b.t)) +
        (beste && besteDag !== d ? ' · <b>beste moment deze week: ' + dagLang(besteDag.uren[0].t) + " " + beste.tekst + ", " + beste.lo + "–" + beste.hi + " kn</b>" : "") +
        '<br><span class="flauw">' + zon + '</span>';
    }
  }

  /* ── samenvatting: welke uren het beste zijn en waarom ──
     Per uur een score: niveau (6/7/8) + stroom tegen (+0,5) of mee (−0,5) − vlagerig (1).
     Beste uren = de uren met de hoogste score in het beste venster; de rest van het venster is "ook prima". */
  function uurScore(u) {
    var n = niveau(u); if (n === "weinig" || n === "aflandig") return null;
    var sc = n === "perfect" ? 8 : n === "goed" ? 7 : 6, c = stroomC(blokBij(u.t), u.dir);
    if (c > 0.3) sc += 0.5; else if (c < -0.5) sc -= 0.5;
    if (u.vl / u.kn >= 1.8) sc -= 1;                     // alleen echt vlagerig; 1,6 hakte een venster in losse uren
    return sc;
  }
  function runs(us) { var out = [], nu = null; us.forEach(function (u) { if (!nu || +u.t.slice(11,13) !== +nu[nu.length-1].t.slice(11,13) + 1) { nu = [u]; out.push(nu); } else nu.push(u); }); return out; }
  function runTekst(r) { return r[0].t.slice(11,13) + "–" + (+r[r.length-1].t.slice(11,13)+1) + " u"; }
  function waarom(us) {
    var c = us.reduce(function (a,u) { return a + stroomC(blokBij(u.t), u.dir); }, 0) / us.length, vl = us.reduce(function (a,u) { return a + u.vl/u.kn; }, 0) / us.length;
    var p = [];
    p.push(c > 0.3 ? "stroom tegen de wind, gratis hoogte" : c < -0.5 ? "stroom mee, je zakt af" : "stroom dwars");
    if (vl >= 1.8) p.push("vlagerig");
    return p.join(", ");
  }
  /* Kentering: het uur waarop de stroom van mee naar tegen draait (of andersom). Bron is per 3 uur,
     dus "rond" en niet "om". */
  function kenteringen(us) {
    var out = [], vorige = null;
    us.forEach(function (u) { var c = stroomC(blokBij(u.t), u.dir), z = c > 0.15 ? "tegen" : c < -0.15 ? "mee" : "dwars";
      if (vorige && z !== vorige && z !== "dwars" && vorige !== "dwars") out.push({ t:u.t, van:vorige, naar:z }); if (z !== "dwars") vorige = z; });
    return out;
  }
  /* Eerste zinsdeel vet (tot de eerste komma of dubbele punt), zodat een lijstje in één blik te scannen is. */
  function vet(p) { var m = /^([^,:]{3,48})([,:])(.+)$/.exec(p); return m ? "<b>" + m[1] + "</b>" + m[2] + m[3] : p; }
  function kenteringTekst(us) { var k = kenteringen(us); return k.length ? "stroom draait " + k.map(function (x) { return "rond " + uurStr(x.t) + " van " + x.van + " naar " + x.naar; }).join(", ") : ""; }

  /* Eén zin: liep vandaag hoger of lager dan het model zei? Alleen op de dag van vandaag, en
     alleen als er genoeg uren geweest zijn om er iets van te vinden. */
  function meetZin() {
    if (st.dag !== 0) return "";
    var a = afwijkingVandaag(); if (!a) return "";
    var kop = Math.abs(a.kn) < 1.5 ? "Het model zit er vandaag goed op."
      : a.kn > 0 ? "Vandaag staat er meer wind dan voorspeld." : "Vandaag staat er minder wind dan voorspeld.";
    var staart = Math.abs(a.kn) < 1.5
      ? "het station zit gemiddeld " + String(Math.abs(a.kn)).replace(".", ",") + " kn van de voorspelling af over " + a.uren + " uur."
      : String(Math.abs(a.kn)).replace(".", ",") + " kn " + (a.kn > 0 ? "meer" : "minder") + ", gemiddeld over " + a.uren + " uur die al geweest zijn. Reken daar de rest van de dag ook op.";
    return '<p class="sv meet"><b>' + kop + '</b> ' + esc(a.station) + ' op ' + String(a.km).replace(".", ",") + ' km meet ' + staart + '</p>';
  }

  function tekenSamenvatting() {
    var d = huidigeDag(), o = dagOordeel(d), el = $("samenvatting");
    if (!o.v) { el.innerHTML = '<p class="sv"><b>' + (o.n === "aflandig" ? "Aflandig, niet gaan." : "Te weinig wind.") + '</b> hoogste ' + o.b.kn + ' kn om ' + uurStr(o.b.t) + '.</p>' + meetZin() +
      '<p class="sv flauw">' +
      (st.dag === 0 ? '<a href="https://windmeting.nl" target="_blank" rel="noopener">wat er nu echt staat, windmeting.nl</a>' : '') + '</p>'; return; }
    var alle = [].concat.apply([], o.ws.map(function (w) { return w.uren; })).filter(function (u) { return uurScore(u) != null; });
    var max = Math.max.apply(null, alle.map(uurScore));
    var beste = alle.filter(function (u) { return uurScore(u) >= max - 0.25; }), rest = alle.filter(function (u) { return uurScore(u) < max - 0.25; });
    var rb = runs(beste), rr = runs(rest), lo = Math.min.apply(null, beste.map(function (u) { return u.kn; })), hi = Math.max.apply(null, beste.map(function (u) { return u.kn; }));
    var html = '<p class="sv beste" style="--tint:' + tint(niveau(top(beste))) + '"><span class="vc">' + max.toString().replace(".", ",") + '</span><b>Beste uren ' + rb.map(runTekst).join(", ") + '</b> · ' + (lo === hi ? lo : lo + "–" + hi) + ' kn, vlagen tot ' + vlMax(beste) + ' · ' + waarom(beste) + ' · kite ' + kiteBereik(lo, hi, vlMax(beste)) + '</p>';
    if (rest.length) { var lo2 = Math.min.apply(null, rest.map(function (u) { return u.kn; })), hi2 = Math.max.apply(null, rest.map(function (u) { return u.kn; }));
      html += '<p class="sv"><b>Ook prima ' + rr.map(runTekst).join(", ") + '</b> · ' + (lo2 === hi2 ? lo2 : lo2 + "–" + hi2) + ' kn · ' + waarom(rest) + '</p>'; }
    var niet = d.uren.filter(function (u) { return uurScore(u) == null; });
    if (niet.length) html += '<p class="sv flauw">Niet: ' + runs(niet).map(runTekst).join(", ") + ' · ' + (niet.some(function (u) { return niveau(u) === "aflandig"; }) ? "aflandig of " : "") + 'te weinig wind</p>';
    html += meetZin();
    var kt = kenteringTekst(d.uren); if (kt) html += '<p class="sv"><b>Stroming:</b> ' + kt + ' (bron per 3 uur, dus ongeveer)</p>';
    html += '<p class="sv flauw"><button type="button" class="link" data-venster="0">hoe het cijfer ontstaat</button>' +
      (st.dag === 0 ? ' · <a href="https://windmeting.nl" target="_blank" rel="noopener">wat er nu echt staat, windmeting.nl</a>' : '') + '</p>';
    el.innerHTML = html;
  }

  // ── welke dag ────────────────────────────────────────
  function tekenWeek() {
    var ds = dagen();
    var kaarten = ds.map(function (d, i) {
      var o = dagOordeel(d);
      return '<button type="button" class="dagkaart' + (i === st.dag ? " aan" : "") + '" data-dag="' + i + '" aria-pressed="' + (i === st.dag) +
        '" style="--tint:' + tint(o.n) + ';--tint-v:' + tintV(o.n) + '"><span class="dk">' + (i === 0 ? "vandaag" : dagStr(d.uren[0].t)) + '</span>' +
        '<span class="dv">' + (o.v ? o.v.lo + "–" + o.v.hi : o.b.kn) + ' <em>kn</em></span>' +
        '<span class="dvl">vlagen ' + (o.v ? o.v.vlLo + "–" + o.v.vlHi : o.b.vl) + '</span>' +
        '<span class="dn">' + (o.v ? o.ws.map(function (w) { return w.tekst; }).join("<br>") : WOORD[o.n]) + '</span>' +
        '<span class="ind">' + d.uren[Math.floor(d.uren.length/2)].nModellen + ' modellen' + (fijnBij(d) ? ", " + fijnBij(d) + " fijn" : (o.b.knLo != null ? " · " + o.b.knLo + "–" + o.b.knHi + " kn uiteen" : "")) + '</span>' +
        (!fijnBij(d) && kansTekst(dagKans(d)) ? '<span class="ind kans-ens">sessiekans ' + kansTekst(dagKans(d)) + '</span>' : '') + '</button>';
    });
    var nauw = ds.map(fijnBij), split = nauw.findIndex(function (n) { return n === 0; });
    if (split < 0) split = ds.length;
    /* Eén rij voor alle dagen; de scheiding tussen fijn en grof is een element in de rij: op breed scherm een kopregel, op mobiel een verticale streep. */
    var kop = function (k, sub, cls) { return '<div class="dsep' + (cls ? " " + cls : "") + '"><b>' + k + '</b><i>' + sub + '</i></div>'; };
    $("weekstrip").innerHTML = kop("Nauwkeurig", "fijne modellen, 2 km", "eerste") + kaarten.slice(0, split).join("") +
      (split < ds.length ? kop("Indicatie", "grove modellen, kans uit de ensembles", "grof") + kaarten.slice(split).join("") : "") +
      (ds.length < 7 ? '<div class="dagkaart leeg"><span class="dk">verder</span><span class="dn">de gekozen modellen kijken niet verder dan ' + ds.length + ' dagen</span></div>' : '');
    /* Overzichtsbalk boven de dagkaarten: de hele week in één rij, per dag een staafje per uur.
       De streep dwars door de balk staat op de wind waarbij je grootste kite net trekt (genoegKn):
       alles wat daarboven uitkomt is een sessie. Rechtsboven per dag de hardste wind van die dag.
       Klik op een dag springt naar de kaart en de uurtabel eronder. */
    var maxKn = Math.max(24, Math.max.apply(null, ds.map(function (d) { return top(d.uren).kn; })));
    $("weekmini").hidden = false; $("wmuitleg").hidden = false;
    $("weekmini").style.setProperty("--grens", Math.round(genoegKn() / maxKn * 100) + "%");
    $("wmuitleg").innerHTML = "Elk staafje is een uur. De streep staat op " + genoegKn() + " kn: daaronder trekt zelfs je grootste kite (" + GROOT() + " m) je niet op het board. Het getal rechts van de dag is de hardste wind van die dag.";
    $("weekmini").innerHTML = ds.map(function (d, i) {
      var o = dagOordeel(d), hardste = top(d.uren).kn;
      return '<button type="button" class="wm' + (i === st.dag ? " aan" : "") + (i === split ? " grof" : "") + '" data-dag="' + i + '" data-spring="1" aria-label="' + dagStr(d.uren[0].t) + ', hardste ' + hardste + ' kn" style="--tint:' + tint(o.n) + '">' +
        '<span class="wmk"><b>' + (i === 0 ? "nu" : DAGK[new Date(d.uren[0].t).getDay()]) + '</b><em>' + hardste + '</em></span><span class="wmb">' +
        d.uren.map(function (u) { return '<i style="height:' + Math.max(6, Math.round(u.kn / maxKn * 100)) + '%;background:' + knKleur(u.kn, niveau(u)) + '"></i>'; }).join("") + '</span></button>';
    }).join("");
  }

  /* Kleinste hoek tussen twee kompaskoersen, 0 t/m 180. */
  function hoekAfwijking(a2, b2) { var d = Math.abs(a2 - b2) % 360; return d > 180 ? 360 - d : d; }

  /* ── wat er echt gemeten is ────────────────────────────
     meting.js komt elk kwartier vers van Rijkswaterstaat (gen-meting.mjs). Per spot het
     dichtstbijzijnde meetstation dat vandaag ook echt meet, met de afstand erbij: 4 km is jouw
     strand, 26 km is een aanwijzing. Alleen uren die al geweest zijn, alleen vandaag. */
  function meetstation() {
    var M = window.KWM; if (!M || !M.spots) return null;
    var k = M.spots[st.spot]; if (!k) return null;
    var bron = (k.bronnen || [{ station:k.station, km:k.km, w:1 }]).filter(function (b) { return M.stations[b.station]; });
    if (!bron.length) return null;
    return { bronnen:bron, km:bron[0].km,
      naam:bron.map(function (b) { return M.stations[b.station].naam; }).join(" en "),
      lijst:bron.map(function (b) { return { naam:M.stations[b.station].naam, km:b.km, w:b.w }; }) };
  }
  /* De meting die het dichtst bij dit hele uur ligt. Liggen er twee stations bijna even dichtbij,
     dan wegen ze allebei mee naar afstand: gemeten scheelt dat gemiddeld een halve knoop.
     De richting middelt als vector, want 350 graden en 10 graden is 0 graden, geen 180. */
  function metingBij(t) {
    var s = meetstation(); if (!s) return null;
    var M = window.KWM, ms = new Date(t).getTime();
    if (ms > Date.now()) return null;                       // de toekomst is nooit gemeten
    var kn = 0, gw = 0, x = 0, y = 0, gd = 0;
    s.bronnen.forEach(function (b) {
      var uren = M.stations[b.station].uren;
      for (var i = 0; i < uren.length; i++) {
        if (Math.abs(new Date(uren[i][0]).getTime() - ms) >= 1800e3) continue;
        kn += uren[i][1] * b.w; gw += b.w;
        if (uren[i][2] != null) { x += b.w * Math.cos(uren[i][2] * Math.PI / 180); y += b.w * Math.sin(uren[i][2] * Math.PI / 180); gd += b.w; }
        return;
      }
    });
    if (!gw) return null;
    return { kn: kn / gw, dir: gd ? Math.round((Math.atan2(y, x) * 180 / Math.PI + 360) % 360) : null };
  }
  /* Hoe ver zat het model er vandaag naast, over alle uren die al geweest zijn?
     Positief = er stond meer wind dan voorspeld. */
  function afwijkingVandaag() {
    var s = meetstation(); if (!s) return null;
    var d = dagen()[0], paren = [];
    d.uren.forEach(function (u) { var m = metingBij(u.t); if (m != null) paren.push(m.kn - u.kn); });
    if (paren.length < 3) return null;
    var som = paren.reduce(function (a, b) { return a + b; }, 0);
    return { kn:Math.round(som / paren.length * 10) / 10, uren:paren.length, station:s.naam, km:s.km };
  }

  /* Het uur waar de klok nu in staat, in dezelfde schrijfwijze als u.t ("2026-09-11T14:00").
     Alleen zinvol op de dag van vandaag; op een andere dag bestaat "nu" niet in de tabel. */
  function uurNu() {
    var n = new Date();
    return n.getFullYear() + "-" + ("0"+(n.getMonth()+1)).slice(-2) + "-" + ("0"+n.getDate()).slice(-2) +
      "T" + ("0"+n.getHours()).slice(-2) + ":00";
  }

  // ── uur voor uur: één dag, tabel zoals Windfinder ────
  function tekenDag() {
    /* i uit st.dag, niet uit indexOf: dagen() bouwt elke aanroep verse objecten, dus indexOf gaf
       altijd -1 en "vandaag," verscheen nooit in de kop. */
    var ds = dagen(), i = Math.min(st.dag, ds.length - 1), d = ds[i], o = dagOordeel(d);

    var kop = '<div class="dagkop" style="--tint:' + tint(o.n) + '"><b>' + (i === 0 ? "vandaag, " : "") + dagLang(d.uren[0].t) + '</b>' +
      '<span class="dagv">' + (o.v ? o.ws.length + (o.ws.length === 1 ? " venster" : " vensters") + " · " + WOORD[o.n] : WOORD[o.n]) + '</span>' +
      '<span class="ind">zon op ' + d.zon.op + ', onder ' + d.zon.onder + indicatieTekst(i, d) + '</span></div>';
    var nu = uurNu();
    /* Elke rijkop met uitleg krijgt dezelfde vorm: tekst links, de i-knop rechts tegen de rand.
       Daardoor staan alle i-knoppen onder elkaar in plaats van achter een toevallig lange tekst. */
    var rijkop = function (tekst, sleutel, label, onder) {
      return '<span class="rk"><span>' + tekst + '</span>' +
        '<button type="button" class="info" data-info="' + sleutel + '" aria-label="' + label + '">i</button></span>' +
        (onder ? '<small>' + onder + '</small>' : '');
    };

    var td = function (u, cls, inhoud, style) { return '<td class="' + cls + (u.t === st.t ? " aan" : "") + (u.t === nu ? " nuur" : "") + '" data-t="' + u.t + '"' + (style ? ' style="' + style + '"' : '') + '>' + inhoud + '</td>'; };
    var rij = function (lbl, cel) { return '<tr><th scope="row">' + lbl + '</th>' + d.uren.map(cel).join("") + '</tr>'; };
    var max = Math.max(30, top(d.uren).kn);
    var vensterRij = (function () {
      var cells = "", k = 0;
      while (k < d.uren.length) {
        var w = o.ws.filter(function (w) { return w.uren[0].t === d.uren[k].t; })[0];
        if (w) { var lbl = w.uren.length >= 4 ? w.tekst + " · " + WOORD[w.n] : w.uren.length >= 2 ? w.tekst.replace(/:00/g, "") : "";
          cells += '<td colspan="' + w.uren.length + '"><span class="vpil" title="' + w.tekst + " · " + WOORD[w.n] + '" style="--tint:' + tint(w.n) + ';--tint-v:' + tintV(w.n) + '">' + lbl + '</span></td>'; k += w.uren.length; }
        else { cells += '<td></td>'; k++; }
      }
      return '<tr class="vrij"><th scope="row">' + rijkop("venster", "venster", "Wat een venster is") + '</th>' + cells + '</tr>';
    })();
    var tabel = '<table class="uurtabel"><tbody>' + (o.v ? vensterRij : "") +
      rij(rijkop("uur", "uur", "Wat het uur en de inktring betekenen"), function (u) { return td(u, "tu", '<button type="button">' + u.t.slice(11,13) + (u.t === nu ? '<small>nu</small>' : '') + '</button>'); }) +
      rij(rijkop("richting", "richting", "Wat de windpijl betekent"), function (u) { return td(u, "", pijl(u.dir, niveau(u) === "aflandig" ? KLEUR.aflandig : "#17130F")); }) +
      /* Onder de wind staat hoe ver de modellen uit elkaar liggen: dat is de onzekerheid van dat
         uur. Stond eerst onder het percentage, maar hij hoort bij de wind. */
      rij(rijkop("wind kn", "modellen", "Hoe de wind wordt berekend", "laag–hoog"), function (u) {
        return td(u, "tw", '<span class="staaf" style="height:' + Math.round(u.kn/max*44) + 'px;background:' + knKleur(u.kn, niveau(u)) + '"></span><b>' + u.kn + '</b>' +
          (u.nModellen > 1 ? '<small' + (u.knHi - u.knLo > 7 ? ' class="onzeker"' : '') + '>' + u.knLo + "–" + u.knHi + '</small>' : '')); }) +
      rij(rijkop("vlagen", "vlagen", "Wat vlagen en spreiding van elkaar verschillen", "+ erbij"), function (u) { var n = niveau(u);
        /* Het gekleurde vlak zit om het getal heen, niet om de hele cel: nu elke rij even hoog is
           zou een cel-achtergrond een blok van 56 px worden. */
        /* Gemeten aan Hoek van Holland, 485 daglichturen 1 aug t/m 10 sep: een vlaag is 1,4x de
           wind (mediaan), p90 1,63. Onder de 12 kn is de mediaan al 1,50, dus daar zegt "vlagerig"
           niets. Het woord "gusty" valt daarom pas vanaf 1,6x en alleen als er genoeg wind staat om te gaan.
           De kleur volgt het oordeel van dat uur, niet de vlaag: anders kleurt 9 kn wind groen
           omdat de vlaag 16 haalt. */
        var extra = Math.max(0, Math.round(u.vl - u.kn)), verhouding = u.kn ? u.vl / u.kn : 0;
        var vlagerig = u.kn >= genoegKn() && verhouding >= 1.6;
        /* Sommige grove modellen leveren geen vlagen: dan is vlaag = wind en zou er "+0" staan.
           Een streepje is eerlijker dan een nul die op windstil lijkt. */
        return td(u, "tv", '<span class="vp">' + u.vl + '</span>' +
          '<small' + (vlagerig ? ' class="gusty" title="gusty: de vlagen zitten meer dan 60% boven de wind"' : '') + '>' + (extra > 0 ? "+" + extra : "—") + '</small>',
          "--tint:" + tint(n) + ";--tint-v:" + tintV(n)); }) +
      (i === 0 && meetstation() ? rij(rijkop("gemeten", "meten", "Welk meetstation en hoe ver weg"), function (u) {
        var m = metingBij(u.t);
        if (m == null) return td(u, "tmeet", '<small>—</small>');
        var v = Math.round((m.kn - u.kn) * 10) / 10;
        var kl = Math.abs(v) < 1.5 ? "raak" : v > 0 ? "meer" : "minder";
        /* Ook de gemeten richting, want een model dat de kracht raakt maar de hoek mist stuurt je
           alsnog het water op met aflandige wind. De pijl wijst waar de wind heen gaat. */
        return td(u, "tmeet", (m.dir != null ? pijl(m.dir, hoekAfwijking(m.dir, u.dir) >= 45 ? KLEUR.matig : "#17130F") : '') +
          '<b>' + Math.round(m.kn) + '</b><small class="' + kl + '">' + (v > 0 ? "+" : "") + String(v).replace(".", ",") + '</small>');
      }) : "") +
      rij(rijkop("kite m", "kite", "Hoe de kitemaat wordt berekend", st.kg + " kg"), function (u) { var n = niveau(u); if (n === "weinig" || n === "aflandig") return td(u, "tkite", '<small>—</small>');
        var k = kiteAdvies(u.kn, u.vl); if (!k) return td(u, "tkite", '<small>—</small>');
        return td(u, "tkite", '<b>' + k.maat + '</b><small>' + (k.vlagerig ? k.klein : Math.max(5, k.maat - 1)) + '–' + Math.min(GROOT(), k.maat + 1) + '</small>', "--tint:" + tint(n) + ";--tint-v:" + tintV(n)); }) +
      rij(rijkop("sessiekans", "zeker", "Waar dit percentage over gaat", genoegKn() + "–" + TEVEEL + " kn"), function (u) { if (!u.nModellen) return td(u, "tm", '<small>—</small>');
        var k = u.kans, kl = k >= 80 ? "perfect" : k >= 50 ? "goed" : k >= 25 ? "matig" : "weinig";
        /* Alleen de twee verrassende redenen erbij: 0% bij 34 kn ("te hard") en 0% bij mooie wind uit
           de verkeerde hoek ("aflandig"). Te weinig wind zie je al aan de windrij, dat woord is ruis. */
        var n = niveau(u);
        var waarom = k >= 50 ? "" : u.kn > TEVEEL ? "te hard" : n === "aflandig" ? "aflandig" : "";
        return td(u, "tm", '<span class="kans" style="--tint:' + tint(kl) + ';--tint-v:' + tintV(kl) + '">' + k + '%</span>' + (waarom ? '<small>' + waarom + '</small>' : '')); }) +
      rij(rijkop("stroming", "stroom", "Wat de stroming met je doet"), function (u) { var b = blokBij(u.t), c = stroomC(b, u.dir);
        return td(u, "ts", b && b.stroom ? pijl(b.stroom.naar + 180, c > 0.15 ? KLEUR.perfect : c < -0.15 ? KLEUR.matig : "#41607A") + '<small>' + b.stroom.kn.toFixed(1) + ' kn</small><small style="color:' + (c > 0.15 ? KLEUR.perfect : c < -0.15 ? KLEUR.matig : "#41607A") + '">' + (c > 0.15 ? "tegen" : c < -0.15 ? "mee" : "dwars") + '</small>' : '<small>—</small>'); }) +
      rij(rijkop("golven", "golven", "Wat de golfhoogte en de periode betekenen"), function (u) { return td(u, "tg", u.golf ? '<span>' + u.golf.m.toFixed(1) + ' m</span><small>' + u.golf.s + ' s</small>' : '<small>—</small>'); }) +
      rij(rijkop("weer", "weer", "Wat het weericoon betekent"), function (u) { var w = weer(u.wx); return td(u, "tx", '<span>' + w[0] + '</span><small>' + u.temp + '°</small>'); }) +
      rij(rijkop("regen", "regen", "Wat de druppels betekenen", "mm per uur"), function (u) { var d = druppels(u.mm); return td(u, "tr", d ? '<span class="drup">' + "💧".repeat(d) + '</span><small>' + u.mm + '</small>' : '<small class="droog">droog</small>'); }) +
      '</tbody></table>';
    $("dagen").innerHTML = '<div class="dag">' + kop + '<div class="scroll">' + tabel + '</div></div>';
    /* Op een smal scherm past de dag niet in beeld: schuif de TABEL naar het uur van nu.
       Met scrollIntoView sprong de hele pagina omlaag bij elke klik op een knop of je gewicht,
       want die schuift ook verticaal. Nu zetten we alleen scrollLeft van het tabelvak. */
    (function () {
      var vak = $("dagen").querySelector(".scroll"); if (!vak) return;
      var doel = vak.querySelector("td.nuur") || vak.querySelector("td.aan"); if (!doel) return;
      vak.scrollLeft = doel.offsetLeft - (vak.clientWidth - doel.offsetWidth) / 2;
    })();
    $("legenda").innerHTML = ["perfect","goed","matig","weinig","aflandig"].map(function (k) {
      var g14 = genoegKn(), g19 = knBij(1.32);
      return '<span class="lg"><i style="background:' + tint(k) + '"></i><b>' + WOORD[k] + '</b>' +
        (k === "perfect" ? " " + g19 + "–" + VEEL : k === "goed" ? " " + g14 + "–" + g19 : k === "matig" ? " boven " + VEEL + ", kleine kite" : k === "weinig" ? " &lt;" + g14 + ", je " + GROOT() + " m trekt niet" : "") + '</span>'; }).join("") +
      '<span class="lg"><b>vlagen 25 +9</b> de piek binnen dat uur, en hoeveel knopen dat boven de wind is. 40% erbij is normaal; kleurt het plusje oker, dan is het gusty en neem je een maat kleiner</span>' +
      '<span class="lg"><b>8–22 onder de wind</b> geen wind maar twijfel: de laagste en hoogste van de tien modellen. Oker = meer dan 7 kn oneens</span>' +
      '<span class="lg"><b>pijl</b> waar de wind of de stroom heen gaat</span>' +
      '<span class="lg"><b>regen</b> 1 druppel is licht, 3 is 1 mm per uur, 5 is een plensbui</span>' +
      '<span class="lg"><b>de rest</b> staat achter de ronde i-knoppen links van de tabel</span>' +
      '<span class="lg disclaimer"><b>⚠️ schatting</b> uit modellen, geen garantie: kijk zelf naar het water en beslis zelf wat je optuigt</span>';
  }

  function openVenster(j) {
    var d = huidigeDag(), w = dagOordeel(d).ws[j]; if (!w) return;
    var c = cijfer(w);
    $("sheet-t").textContent = dagStr(w.uren[0].t) + " " + w.tekst + " · " + c.score.toString().replace(".", ",");
    $("sheet-b").innerHTML = '<p class="sheet-een">' + c.een + '</p><ul class="redenen">' +
      c.plus.map(function (p) { return '<li class="p">' + vet(p) + '</li>'; }).join("") + c.min.map(function (p) { return '<li class="m">' + vet(p) + '</li>'; }).join("") + '</ul>' +
      [["wind", w.lo + "–" + w.hi + " kn uit " + kompas(top(w.uren).dir)], ["vlagen tot", Math.max.apply(null, w.uren.map(function (u) { return u.vl; })) + " kn"],
       ["duur", w.uren.length + " uur"], ["kite", kiteBereik(w.lo, w.hi, vlMax(w.uren)) + " bij " + st.kg + " kg, " + st.board + ". Maat op de gemiddelde wind; vlagen tot " + vlMax(w.uren) + " kn" + (vlMax(w.uren) / w.hi >= 1.5 ? ", dat is 1,5× de wind: neem de kleine" : ", dat kan de kite hebben")],
       ["cijfer", c.som],
       ["modellen", st.modellen.length + " aangevinkt, " + mixNaam() + (w.uren[0].off ? ", grof +" + w.uren[0].off + " kn" : "")]
      ].map(function (r) { return '<div class="rij"><span>' + r[0] + '</span><span>' + r[1] + '</span></div>'; }).join("");
    $("sheet").hidden = false; $("sheet-x").focus();
  }
  /* Wat het meetstation is, hoe ver het weg staat, en wanneer je het wel en niet moet geloven. */
  function openMeten() {
    var s = meetstation();
    $("sheet-t").textContent = "Wat er echt gemeten is";
    $("sheet-b").innerHTML = '<ul class="redenen">' +
      (s && s.lijst.length === 1
        ? '<li class="p"><b>' + esc(s.lijst[0].naam) + '</b>, op ' + String(s.lijst[0].km).replace(".", ",") + ' km van ' + esc(spot().naam) + '. Het dichtstbijzijnde station van Rijkswaterstaat dat vandaag werkt.</li>'
        : s ? '<li class="p"><b>Twee stations samen</b>, want ze liggen even ver van ' + esc(spot().naam) + ': ' +
            s.lijst.map(function (b) { return esc(b.naam) + ' op ' + String(b.km).replace(".", ",") + ' km telt voor ' + Math.round(b.w * 100) + '%'; }).join(", ") +
            '. Nagerekend scheelt dat een halve knoop.</li>' : '') +
      '<li class="p"><b>Het kleine cijfer is het verschil</b> met wat het model voor dat uur zei. Groen is meer wind dan voorspeld, oker is minder, grijs betekent dat het model erop zat.</li>' +
      '<li class="m">Onder de 10 km is het jouw strand, boven de 20 km een aanwijzing. Een paal op zee vangt meer wind dan een strand in de luwte van de duinen.</li></ul>';
    $("sheet").hidden = false; $("sheet-x").focus();
  }

  /* Kans per windsterkte voor één uur, uit de losse ensembleleden (31 GFS-runs + 51 ECMWF-runs).
     Vier kaartjes omdat het vier verschillende beslissingen zijn: 12 = ga ik, 15 = wordt het leuk,
     20 = neem ik de kleine kite mee, boven 30 = ik blijf aan land. Geeft null als er geen ensemble is. */
  function kansPerDrempel(t) {
    var sp = KWU.spots[st.spot]; if (!sp || !sp.ens) return null;
    var i = sp.uren.findIndex(function (x) { return x.t === t; }); if (i < 0) return null;
    var leden = [], off = st.mix === "dajk" ? optelling() : 0;
    Object.keys(sp.ens).forEach(function (e) { var v = sp.ens[e][i]; if (v) v.forEach(function (x) { leden.push(x + off); }); });
    if (leden.length < 20) return null;
    var pct = function (f) { return Math.round(leden.filter(f).length / leden.length * 100); };
    /* De drie kaartjes zijn kansen om te gaan. Te veel wind is geen kans maar een waarschuwing,
       dus die staat apart en niet als vierde kaartje. */
    var g0 = genoegKn();
    /* Het woord staat in het kaartje zelf, niet in het venster: daar is g0 niet bekend. */
    var rollen = [[g0, "je grootste kite trekt"], [g0 + 3, "lekker powered"], [g0 + 7, "kleine kite mee"]];
    return { kaarten: rollen.map(function (r) {
      return { grens:r[0], rol:r[1], pct:pct(function (x) { return x >= r[0]; }) };
    }), teHard: pct(function (x) { return x > TEVEEL; }) };
  }

  /* Waarom een percentage boven een windgetal staat, en wat je ermee doet. */
  function openZeker() {
    var u = gekozen(), kd = kansPerDrempel(u.t);
    $("sheet-t").textContent = "Kans op een sessie om " + uurStr(u.t);
    $("sheet-b").innerHTML = (kd ? '<div class="drempels">' + kd.kaarten.map(function (k) {
        var kl = k.pct >= 70 ? "perfect" : k.pct >= 40 ? "goed" : k.pct >= 15 ? "matig" : "weinig";
        return '<div class="dr" style="--tint:' + tint(kl) + ';--tint-v:' + tintV(kl) + '"><b>' + k.pct + '%</b>' +
          '<span>' + k.grens + ' kn of meer</span><small>' +
          k.rol + '</small></div>';
      }).join("") + '</div>' +
      '<p class="tehard' + (kd.teHard >= 15 ? " op" : "") + '"><b>Te hard: ' + kd.teHard + '%</b> van die doorrekeningen geeft meer dan ' + TEVEEL + ' kn. Dat is geen kans maar een waarschuwing: dan blijf je aan land, en daarom telt het in de tabel als nee.</p>' : "") +
      '<ul class="redenen">' +
      (kd ? '<li class="p"><b>Die drie kaartjes</b> komen uit 82 doorrekeningen van hetzelfde weer, elk met een klein duwtje verschil. Ze kijken alleen naar de kracht, niet naar de hoek.</li>' : "") +
      '<li class="p"><b>Het getal in de tabel telt drie dingen samen.</b> Het is het deel van de tien modellen dat zegt: minstens ' + genoegKn() + ' kn, hoogstens ' + TEVEEL + ' kn, en uit een hoek die op ' + esc(spot().naam) + ' veilig is. Het model dat het vaakst gelijk had, telt zwaarder.</li>' +
      '<li class="p"><b>Te veel wind telt dus als nee.</b> Tussen ' + VEEL + ' en ' + TEVEEL + ' kn is het jouw kleine kite, daarboven telt het als nee en staat er "te hard" onder het percentage.</li>' +
      '<li class="p"><b>0% terwijl er wind staat, is de hoek of te veel wind.</b> Onder het getal staat welke van de twee.</li></ul>';
    $("sheet").hidden = false; $("sheet-x").focus();
  }

  /* Wat de stroming met je doet, in de woorden van iemand die op het water staat. */
  function openStroom() {
    $("sheet-t").textContent = "Stroming";
    $("sheet-b").innerHTML = '<ul class="redenen">' +
      '<li class="p"><b>Stroom tegen de wind in is gratis hoogte.</b> Het water duwt je bovenwinds terwijl je vaart, dus je verliest minder terrein en je kite krijgt meer druk.</li>' +
      '<li class="p"><b>Stroom met de wind mee kost je je sessie.</b> Je zakt af, en terugkruisen tegen stroom en wind in is zwaar werk.</li>' +
      '<li class="p"><b>De pijl wijst waar het water heen gaat.</b> Het getal is de sterkte in knopen, het woord zegt of hij tegen, mee of dwars staat.</li></ul>';
    $("sheet").hidden = false; $("sheet-x").focus();
  }

  function openKite() {
    $("sheet-t").textContent = "Hoe de kitemaat wordt berekend";
    $("sheet-b").innerHTML =
      '<ul class="redenen">' +
      '<li class="p"><b>Grote getal</b> = de maat waarmee je bij die wind lekker powered staat: 2,2 × je gewicht ÷ knopen, × 1 voor twintip en iets kleiner voor directional. Bij ' + st.kg + ' kg en 19 kn is dat ' + Math.round(ideaal(19)) + ' m.</li>' +
      '<li class="p"><b>Bereik eronder</b>: één maat kleiner (vlagen, jij wilt rustig) tot één maat groter (ondergrens van het venster, je wilt zeker de hoogte halen).</li>' +
      '<li class="m">Schatting uit modellen die er geregeld 3 tot 5 kn naast zitten. Kijk naar het water en naar wat de anderen optuigen, en beslis zelf.</li></ul>';
    $("sheet").hidden = false; $("sheet-x").focus();
  }
  /* Korte vensters: drie regels of minder, plat Nederlands, geen formules. Wie meer wil, klikt
     door naar de lange vensters (wind, kans, meting, kite, stroming). */
  var KORT = {
    uur: ["Het uur", [
      "<b>Elk kolommetje is één heel uur.</b> Klik erop en de strandkaart onderaan springt naar dat uur.",
      "<b>De zwarte lijn eromheen is nu.</b> Alles links ervan is geweest, alles rechts moet nog komen.",
      "<b>De tabel begint bij zon op en stopt bij zon onder.</b> In het donker ga je toch niet."]],
    richting: ["De windpijl", [
      "<b>De pijl wijst waar de wind naartoe gaat</b>, niet waar hij vandaan komt.",
      "<b>Oranje betekent aflandig:</b> de wind blaast van het strand de zee op. Gaat je kite neer, dan drijf je weg van de kant.",
      "<b>Zwart is veilig voor deze spot.</b> Welke hoeken veilig zijn komt uit de spotkennis van mijn vader."]],
    golven: ["Golven", [
      "<b>Het bovenste getal is de hoogte</b> in meters, van dal tot top.",
      "<b>Het onderste is de periode</b>: hoeveel seconden tussen twee golven. Kort onder 5 is hakkerige chop, lang boven 8 zijn echte rollers.",
      "<b>Voor kiten:</b> tot ongeveer een meter is het vlak genoeg om te leren, daarboven wordt het springen of ploegen."]],
    weer: ["Het weer", [
      "<b>Het icoon is het weerbeeld van dat uur</b>: zon, wolken, of een bui.",
      "<b>Het getal is de temperatuur</b> in graden. Onder de 15 is het pak-en-handschoenenwerk.",
      "<b>Een bui brengt vaak een windstoot</b> ervoor en een gat erna. Kijk dan ook naar de vlagen."]],
    regen: ["Regen", [
      "<b>Eén druppel is licht</b>, drie is 1 mm per uur, vijf is een plensbui.",
      "<b>Het getal is millimeters per uur.</b> Droog staat er als er niets valt.",
      "<b>Regen maakt je kite zwaarder</b> en het zicht slechter, maar hij vliegt gewoon door."]],
    venster: ["Het venster", [
      "<b>Een venster is een rij uren achter elkaar waarin je kunt</b>: genoeg wind, niet te hard, en uit een veilige hoek.",
      "<b>De balk laat zien hoe lang het duurt</b> en welk oordeel er hoort bij het grootste deel van die uren.",
      "<b>Klik erop</b> voor het cijfer van dat venster, de kitemaat en wat er mee en tegen zit.",
      "<b>Een 9 is het hoogste dat de wind alleen kan halen</b>, en die krijg je in jouw band. Voor een 10 moet er meer goed staan: rustige wind zonder grote vlagen, stroom tegen de wind in, en een venster van vier uur of langer. Een 10 is dus zeldzaam, en dat hoort.",
      "<b>Hard waaien kost geen punten.</b> Boven 30 kn heet het hier gewoon hard, met een kleine kite, en het cijfer blijft hoog. Wat daar w\u00e9l telt zijn de vlagen, de stroom en de golven: die wegen daar anderhalf keer zo zwaar, want bij die wind maken zij het verschil tussen een topsessie en een worsteling."]]
  };
  function openKort(k) {
    var x = KORT[k]; if (!x) return;
    $("sheet-t").textContent = x[0];
    $("sheet-b").innerHTML = '<ul class="redenen">' + x[1].map(function (r) { return '<li class="p">' + r + '</li>'; }).join("") + '</ul>';
    $("sheet").hidden = false; $("sheet-x").focus();
  }

  /* De vraag die twee keer is gesteld: is wind–vlagen niet hetzelfde als de spreiding? Nee.
     Vlagen = wat er binnen dat uur echt gebeurt. Spreiding = hoe oneens de modellen zijn. */
  function openVlagen() {
    var u = gekozen();
    $("sheet-t").textContent = "Vlagen en spreiding zijn twee dingen";
    $("sheet-b").innerHTML = '<ul class="redenen">' +
      '<li class="p"><b>De vlaag gebeurt echt.</b> Binnen één uur waait het niet gelijkmatig: de wind zakt weg en piekt een paar seconden. Dat plusje is hoeveel knopen zo\'n piek erbovenop komt. Hier om ' + uurStr(u.t) + ': ' + u.kn + ' kn met pieken tot ' + u.vl + '.</li>' +
      '<li class="p"><b>Dat is normaal, geen waarschuwing.</b> Gemeten aan Hoek van Holland, 485 daglichturen deze zomer: een piek zit 40% boven de wind (middelste waarde), en bij negen van de tien uren tussen 20% en 67% erboven. Pas vanaf 60% erbij noemen we het gusty, en dan neem je een maat kleiner.</li>' +
      '<li class="p"><b>De spreiding onder de wind is iets anders: dat is twijfel.</b> Tien rekenmodellen kijken naar dezelfde dag; ' + u.knLo + ' is de laagste die eruit komt, ' + u.knHi + ' de hoogste. Dat gaat niet binnen een uur gebeuren, dat is hoe oneens ze zijn. Oker betekent meer dan 7 kn oneens: kijk morgen opnieuw.</li></ul>';
    $("sheet").hidden = false; $("sheet-x").focus();
  }
  function openModellen() {
    $("sheet-t").textContent = "Hoe de wind wordt berekend";
    $("sheet-b").innerHTML =
      '<ul class="redenen">' +
      '<li class="p"><b>Middelste waarde</b> van de aangevinkte modellen, het trefzekerste model weegt het zwaarst.</li>' +
      '<li class="p"><b>Fijn</b> (2 km) ziet de kust, reikt 2 dagen. <b>Grof</b> (7–15 km) reikt 7 dagen; na dag 3 lopen ze uiteen, kijk naar laagste–hoogste.</li>' +
      '<li class="p"><b>DAJK-mix</b>: fijn zolang het reikt, daarna grof met +' + optelling() + ' kn erbij, want de grove modellen lezen aan het water te laag. <a href="docs/?p=dajk-mix.md" target="_blank" rel="noopener">Hoe en waarom</a>.</li></ul>';
    $("sheet").hidden = false; $("sheet-x").focus();
  }
  function sluit() { $("sheet").hidden = true; document.body.classList.remove("modal-open"); }
  new MutationObserver(function () { document.body.classList.toggle("modal-open", !$("sheet").hidden); }).observe($("sheet"), { attributes:true, attributeFilter:["hidden"] });

  // ── modellen: knop in de kop, keuze in een paneel ────
  function tekenModelknop() {
    var d = huidigeDag(), nd = d.uren[Math.floor(d.uren.length/2)].nModellen;
    $("modelknop").innerHTML = '<b>' + mixNaam() + '</b><span>' + nd + ' van ' + st.modellen.length + ' modellen</span>';
  }
  function mixNaam() { return st.mix === "dajk" ? "DAJK-mix" : st.mix === "dajk-oud" ? "DAJK-oud" : "AJK-mix"; }
  function tekenModellen() {
    var alle = KWU.modellen.map(function (m) { return m.id; });
    var mixKnop = function (id, lbl, sub) { return '<button type="button" class="mixknop' + (st.mix === id ? " aan" : "") + '" data-mset="' + id + '" aria-pressed="' + (st.mix === id) + '"><b>' + lbl + '</b><span>' + sub + '</span></button>'; };
    return '<div class="mixen">' +
      mixKnop("dajk", "DAJK-mix", "fijn zolang het reikt, daarna grof geijkt op de meting · trefkans dag 2–6 twee keer zo hoog") +
      mixKnop("ajk", "AJK-mix", "fijn en grof altijd 50/50, zoals op ajk68.com") + '</div>' +
      '<div class="mkop"><span>Los aan- of uitzetten</span><button type="button" class="link" data-mset="' + (st.modellen.length === alle.length ? "een" : "alle") + '">' + (st.modellen.length === alle.length ? "alleen fijn" : "alles aan") + '</button></div>' +
      '<div class="mchips">' + KWU.modellen.map(function (m) {
        var aan = st.modellen.indexOf(m.id) >= 0;
        return '<button type="button" class="mchip' + (aan ? " aan" : "") + '" data-model="' + m.id + '" aria-pressed="' + aan + '">' + esc(m.naam) + '<small>' + m.dagen + ' dag · ' + (m.klasse === "regionaal" ? "fijn" : "grof") +  (st.mix === "dajk" && m.off ? ' · +' + optelling() : '') + '</small></button>'; }).join("") + '</div>' +
      '<p class="sv flauw">Wind = gewogen middelste waarde van wat aanstaat, trefzekerste model weegt het zwaarst. <button type="button" class="link" data-info="modellen">hoe dat werkt</button></p>';
  }
  function openModelPaneel() {
    $("sheet-t").textContent = "Windmodellen";
    $("sheet-b").innerHTML = tekenModellen();
    $("sheet").hidden = false; $("sheet-x").focus();
  }

  function tekenSpotkeuze() {
    var s = spot();
    $("spotknop").innerHTML = '<b>' + esc(s.naam) + '</b><span>' + esc(s.regio || "") + '</span>';
  }
  var zoek = "";
  function tekenSpots() {
    var q = zoek.trim().toLowerCase();
    var kaart = function (s) { return '<button type="button" class="spotkeus' + (s.id === st.spot ? " aan" : "") + '" data-spot="' + s.id + '" aria-pressed="' + (s.id === st.spot) + '"><b>' + esc(s.naam) + '</b><span>' + esc(s.regio || "") + (s.metingen && s.metingen.length ? " · meetstation" : "") + '</span></button>'; };
    var aanb = (KW.aanbevolen || []).map(function (id) { return KW.spots.filter(function (s) { return s.id === id; })[0]; }).filter(Boolean);
    var treffers = q ? KW.spots.filter(function (s) { return (s.naam + " " + (s.regio || "")).toLowerCase().indexOf(q) >= 0; }) : [];
    return '<input type="search" id="spotzoek" placeholder="Zoek een spot, bijv. Texel of Zeeland" value="' + esc(zoek) + '" autocomplete="off">' +
      (q ? '<div class="spotlijst">' + (treffers.length ? treffers.map(kaart).join("") : '<p class="sv flauw">niets gevonden</p>') + '</div>'
         : '<p class="sv flauw">Aanbevolen</p><div class="spotlijst">' + aanb.map(kaart).join("") + '</div><p class="sv flauw">Alle ' + KW.spots.length + ' spots van ajk68.com: typ hierboven.</p>');
  }
  function openSpotPaneel() {
    $("sheet-t").textContent = "Welke spot";
    $("sheet-b").innerHTML = tekenSpots();
    $("sheet").hidden = false; $("sheet-x").focus();   // niet het zoekveld: op mobiel schuift het toetsenbord anders het paneel weg
  }
  /* Spot wisselen: eerst de data van die spot ophalen, dan pas tekenen. Ondertussen staat de knop op "laden". */
  function kiesSpot(id) {
    $("spotknop").innerHTML = '<b>' + esc((KW.spots.filter(function (s) { return s.id === id; })[0] || {}).naam || id) + '</b><span>laden…</span>';
    window.KWU_LAAD(id).then(function () { st.spot = id; st.t = null; st.dag = 0; cache.key = null; sluit(); teken(); })
      .catch(function (e) { $("spotknop").innerHTML = '<b>' + esc(spot().naam) + '</b><span style="color:var(--aflandig)">laden mislukt, probeer opnieuw</span>'; console.warn(e); });
  }
  function teken() { bewaar(); tekenSpotkeuze(); tekenHero(); tekenNu(); tekenModelknop(); tekenWeek(); tekenDag(); tekenSamenvatting(); tekenScene();
    if (!$("sheet").hidden && $("sheet-t").textContent === "Windmodellen") $("sheet-b").innerHTML = tekenModellen(); }

  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-open-spot]")) return openSpotPaneel();
    var sp = e.target.closest("[data-spot]"); if (sp) return kiesSpot(sp.dataset.spot);
    var bd = e.target.closest("[data-board]");
    if (bd) { bd.parentNode.querySelectorAll("button").forEach(function (b) { b.classList.remove("on"); }); bd.classList.add("on"); st.board = bd.dataset.board; return teken(); }
    var ms = e.target.closest("[data-mset]");
    if (ms) { var k = ms.dataset.mset;
      if (k === "dajk") { st.mix = k; st.modellen = DAJK.slice(); }
      else if (k === "ajk") { st.mix = k; st.modellen = ARTHUR.slice(); }
      else st.modellen = k === "alle" ? KWU.modellen.map(function (m) { return m.id; }) : KWU.modellen.filter(function (m) { return m.klasse === "regionaal"; }).map(function (m) { return m.id; });
      st.t = null; return teken(); }
    var mc = e.target.closest("[data-model]");
    if (mc) { var id = mc.dataset.model, ix = st.modellen.indexOf(id); if (ix >= 0) { if (st.modellen.length > 1) st.modellen.splice(ix,1); } else st.modellen.push(id); st.t = null; return teken(); }
    if (e.target.closest("[data-open-modellen]")) return openModelPaneel();
    if (e.target.closest("[data-info=\"modellen\"]")) return openModellen();
    if (e.target.closest("[data-info=\"kite\"]")) return openKite();
    if (e.target.closest("[data-info=\"meten\"]")) return openMeten();
    if (e.target.closest("[data-info=\"zeker\"]")) return openZeker();
    if (e.target.closest("[data-info=\"stroom\"]")) return openStroom();
    if (e.target.closest("[data-info=\"vlagen\"]")) return openVlagen();
    var kort = e.target.closest("[data-info]");
    if (kort && KORT[kort.dataset.info]) return openKort(kort.dataset.info);
    var vn = e.target.closest("[data-venster]"); if (vn) return openVenster(+vn.dataset.venster);
    if (e.target.id === "sheet-x" || e.target.id === "sheet") return sluit();
    var dg = e.target.closest("[data-dag]"); if (dg) { st.dag = +dg.dataset.dag; st.t = null; teken();
      if (dg.dataset.spring) { var k = document.querySelector(".dagkaart.aan"); if (k) k.scrollIntoView({ block: "nearest", inline: "start", behavior: "smooth" }); } return; }
    var bl = e.target.closest("[data-t]"); if (bl) { st.t = bl.dataset.t; return teken(); }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("sheet").hidden) sluit(); });
  document.addEventListener("input", function (e) { if (e.target.id === "spotzoek") { zoek = e.target.value; var lijst = $("sheet-b"); lijst.innerHTML = tekenSpots(); var z = $("spotzoek"); z.focus(); z.setSelectionRange(z.value.length, z.value.length); } });
  $("schuif").addEventListener("input", function (e) { st.t = huidigeDag().uren[+e.target.value].t; teken(); });
  /* Gewicht met min en plus in stappen van 5 kg: tikken in plaats van een cijfer intypen, en op
     een telefoon springt er geen toetsenbord over de pagina. */
  document.querySelectorAll("[data-kg]").forEach(function (b) {
    b.addEventListener("click", function () {
      st.kg = Math.max(40, Math.min(140, st.kg + parseInt(b.dataset.kg, 10)));
      $("kglabel").textContent = st.kg + " kg"; bewaar(); teken();
    });
  });
  /* Kitematen uit een lijst: 4 t/m 15 m, want dat is wat mensen echt hebben. */
  (function () {
    var opties = "";
    for (var m = 4; m <= 15; m++) opties += '<option value="' + m + '"' + (m === st.groot ? " selected" : "") + '>' + m + ' m</option>';
    $("groot").innerHTML = opties;
  })();
  $("groot").addEventListener("change", function (e) { st.groot = parseInt(e.target.value, 10); bewaar(); teken(); });

  $("legenda-box").open = window.matchMedia("(min-width:601px)").matches;
  if (st.groot < 4 || st.groot > 15) st.groot = 12;          // oude opgeslagen maat buiten de lijst
  $("kglabel").textContent = st.kg + " kg";
  document.querySelectorAll("[data-board]").forEach(function (b) { b.classList.toggle("on", b.dataset.board === st.board); });
  if (!KW.spots.some(function (x) { return x.id === st.spot; })) st.spot = "kijkduin";
  window.KWU_LAAD(st.spot).catch(function () { st.spot = "kijkduin"; return window.KWU_LAAD(st.spot); }).then(function () {
    var klok = function (x) { return x ? new Date(x).toLocaleString("nl-NL", { day:"numeric", month:"numeric", hour:"2-digit", minute:"2-digit" }) : "onbekend"; };
    /* Hoe oud iets is zegt meer dan hoe laat het opgehaald is: bij een gemiste verversing zie je
       meteen "3 uur oud" in plaats van een tijd die je zelf moet aftrekken. */
    var oud = function (x) {
      if (!x) return "";
      var m = Math.round((Date.now() - new Date(x).getTime()) / 60000);
      if (m < 2) return " (net)";
      if (m < 90) return " (" + m + " min oud)";
      return " (" + Math.round(m / 60) + " uur oud)";
    };
    var regels = [(KWU.live ? "wind live opgehaald " : "wind uit de noodvoorraad, ") + klok(KWU.gegenereerd)];
    if (window.KWS) regels.push("stroming " + klok(window.KWS.gegenereerd));
    if (window.KWM) regels.push("metingen " + klok(window.KWM.gegenereerd) + oud(window.KWM.gegenereerd));
    $("ververst").textContent = "bijgewerkt: " + regels.join(" · ");
    teken();
  });

  /* Een pagina die uren openstaat (telefoon in je zak op het strand) wees anders nog naar het uur
     waarop je hem opende, en na middernacht naar de verkeerde dag. Elke minuut kijken of het uur
     is verschoven; is dat zo, opnieuw tekenen. Is de dag verschoven, dan eerst verse data halen,
     want de dagenlijst zelf klopt dan niet meer. */
  (function () {
    var laatsteUur = uurNu();
    setInterval(function () {
      var nu = uurNu();
      if (nu === laatsteUur) return;
      var andereDag = nu.slice(0, 10) !== laatsteUur.slice(0, 10);
      laatsteUur = nu;
      if (andereDag) { location.reload(); return; }
      teken();
    }, 60e3);
  })();
});
