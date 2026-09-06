/* Kiteweer — vijf niveaus, één kleur per niveau, verder geen kleur.
   perfect · goed · matig · te weinig · aflandig
   Uur-voor-uur, zon, golven uit uur.js (Open-Meteo, KNMI Harmonie eerst).
   Stroming, spreiding en metingen uit data.js (3-uursblokken). */

(function () {
  "use strict";

  var RIJDBAAR = KW.rijdbaar || 12;
  var DAGL = ["zondag","maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag"];
  var DAGK = ["zo","ma","di","wo","do","vr","za"];
  var KOMPAS = ["N","NNO","NO","ONO","O","OZO","ZO","ZZO","Z","ZZW","ZW","WZW","W","WNW","NW","NNW"];

  var BOARDS = { twintip:1, directional:0.8 };
  var ARTHUR = KWU.modellen.filter(function (m) { return m.arthur; }).map(function (m) { return m.id; });
  var st = { board:"twintip", kg:85, spot:KW.spots[0].id, dag:0, t:null, modellen:ARTHUR.slice(), mix:"ajk" };
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
  function band(kn) { return kn < RIJDBAAR ? "weinig" : kn < 15 ? "matig" : kn < 20 ? "goed" : kn <= 30 ? "perfect" : "matig"; }
  function niveau(u) { if (!u) return "weinig"; if (!veilig(spot(), u.dir) && u.kn >= RIJDBAAR) return "aflandig"; return band(u.kn); }
  var WOORD = { perfect:"perfect", goed:"goed", matig:"matig", weinig:"te weinig wind", aflandig:"aflandig" };
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
    if (st.mix === "djk") cw = { regionaal:1, globaal:0 };
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
      var rows = ids.map(function (m) { return sp.modellen[m][i]; }), ws = gewichten(ids);
      var sx = 0, sy = 0, ja = 0; rows.forEach(function (r, j) {
        sx += ws[j]*Math.cos(r[2]*Math.PI/180); sy += ws[j]*Math.sin(r[2]*Math.PI/180);
        if (r[0] >= RIJDBAAR && veilig(s, r[2])) ja += ws[j];                       // Arthurs gate, per model één stem
      });
      var kns = rows.map(function (r) { return r[0]; });
      return Object.assign({}, u, { kn:gewMediaan(kns, ws), vl:gewMediaan(rows.map(function (r) { return r[1]; }), ws),
        dir:Math.round((Math.atan2(sy, sx)*180/Math.PI + 360) % 360), nModellen:rows.length, nJa:rows.filter(function (r) { return r[0] >= RIJDBAAR && veilig(s, r[2]); }).length,
        kans:Math.round(ja*100), knLo:Math.min.apply(null,kns), knHi:Math.max.apply(null,kns) });
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

  /* Alle aaneengesloten vensters goed/perfect, beste eerst (niveau, dan lengte). */
  function vensters(us) {
    var alle = [], nu = null;
    us.forEach(function (u) {
      var n = niveau(u);
      if (n === "perfect" || n === "goed") { if (!nu) { nu = []; alle.push(nu); } nu.push(u); } else nu = null;
    });
    return alle.map(function (v) {
      var kns = v.map(function (u) { return u.kn; });
      var n = v.some(function (u) { return niveau(u) === "perfect"; }) ? "perfect" : "goed";
      return { uren:v, n:n, lo:Math.min.apply(null,kns), hi:Math.max.apply(null,kns),
        tekst: uurStr(v[0].t) + "–" + (+v[v.length-1].t.slice(11,13)+1) + ":00" };
    }).sort(function (a,b) { return RANG[a.n] - RANG[b.n] || b.uren.length - a.uren.length; });
  }
  function top(us) { return us.reduce(function (a,u) { return u.kn > a.kn ? u : a; }); }
  function dagOordeel(d) {
    var ws = vensters(d.uren), b = ws.length ? top(ws[0].uren) : top(d.uren);
    return { ws:ws, v:ws[0] || null, b:b, n:ws.length ? ws[0].n : niveau(b) };
  }
  /* Gekozen uur; standaard het eerste kitebare uur van de dag, anders het hardste. */
  function gekozen() {
    var d = huidigeDag(), u = d.uren.filter(function (x) { return x.t === st.t; })[0];
    if (u) return u;
    var o = dagOordeel(d); u = o.v ? o.v.uren[0] : o.b; st.t = u.t; return u;
  }
  /* Dichtstbijzijnde 3-uursblok uit data.js: stroming + spreiding tussen de modellen. */
  function blokBij(t) {
    var bl = spot().blokken || [], ms = new Date(t).getTime(), beste = null;
    bl.forEach(function (b) { var d = Math.abs(new Date(b.t).getTime() - ms); if (!beste || d < beste.d) beste = { b:b, d:d }; });
    return beste && beste.d <= 2*3600e3 ? beste.b : null;
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
  function staat(maat, kn) {
    var r = maat / ideaal(kn);
    return r > 1.22 ? "over" : r > 1.08 ? "iets over" : r < 0.80 ? "te klein" : r < 0.93 ? "iets under" : "goed";
  }
  /* Welke maat past bij een windbereik: afgerond op hele meters, hoog naar laag. */
  /* Maat op de gemiddelde wind. Trekkracht groeit met wind², dus bij vlaag/wind ≥ 1,5 één maat kleiner.
     Geijkt op één sessie (30-08, 19 kn → 10 m bij 85 kg): medium zekerheid. */
  function kiteAdvies(kn, vl) {
    var m = Math.round(ideaal(kn)), vlagerig = vl / kn >= 1.5;
    return { maat:m, klein:vlagerig ? Math.max(5, m - 2) : null, vlagerig:vlagerig };
  }
  function kiteBereik(lo, hi, vl) {
    var a = kiteAdvies(hi, vl), b = kiteAdvies(lo, vl);
    var tekst = a.maat === b.maat ? a.maat + " m" : a.maat + "–" + b.maat + " m";
    return a.vlagerig ? tekst + ", vlagerig: liever " + a.klein + " m" : tekst;
  }
  function vlMax(us) { return Math.max.apply(null, us.map(function (u) { return u.vl; })); }

  /* ── cijfer voor een venster: wind, stabiliteit, stroming, golven, lengte ── */
  function cijfer(v) {
    var us = v.uren, n = us.length, pl = [], mn = [], start = v.n === "perfect" ? 8 : 7, score = start, som = [];
    var tel = function (d, tekst) { score += d; som.push((d > 0 ? "+ " : "− ") + Math.abs(d).toString().replace(".", ",") + " " + tekst); (d > 0 ? pl : mn).push(tekst); };
    var vl = us.reduce(function (a,u) { return a + (u.vl - u.kn); }, 0) / n;
    if (vl >= 10) tel(-1.5, "vlagerig, vlagen " + Math.round(vl) + " kn boven de wind"); else if (vl < 6) tel(0.5, "stabiele wind");
    var c = us.reduce(function (a,u) { return a + stroomC(blokBij(u.t), u.dir); }, 0) / n;
    if (c > 0.3) tel(0.5, "stroom tegen de wind, gratis hoogte"); else if (c < -0.5) tel(-0.5, "stroom mee, je zakt af");
    var g = us.filter(function (u) { return u.golf; }); var gm = g.length ? g.reduce(function (a,u) { return a + u.golf.m; }, 0) / g.length : null;
    if (gm != null) { if (gm > 1.5) tel(-0.5, "flinke golven " + gm.toFixed(1) + " m"); else if (gm < 0.5) pl.push("vlak water"); }
    var mm = us.reduce(function (a,u) { return a + (u.mm||0); }, 0);
    if (mm >= 2) tel(-0.5, "regen, " + mm.toFixed(1) + " mm in het venster");
    if (n >= 4) pl.push(n + " uur lang"); else if (n <= 1) tel(-1, "slechts 1 uur");
    score = Math.max(1, Math.min(10, Math.round(score * 2) / 2));
    return { score:score, plus:pl, min:mn, som: start + " voor " + WOORD[v.n] + " wind" + (som.length ? " " + som.join(" ") : "") + " = " + score.toString().replace(".", ","),
      een: (v.n === "perfect" ? "Perfecte wind" : "Goede wind") + (pl.length ? ", " + pl[0] : "") + (mn.length ? ", maar " + mn[0].split(",")[0] : "") };
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
    function arrow(cx, cy, rot, len, kleur, dik, op) {
      var kop = -len/2;
      return '<g transform="translate(' + cx + ',' + cy + ') rotate(' + rot + ')" opacity="' + (op||1) + '">' +
        '<line x1="0" y1="' + (len/2) + '" x2="0" y2="' + (kop + dik*2) + '" stroke="' + kleur + '" stroke-width="' + dik + '" stroke-linecap="round"/>' +
        '<path d="M 0 ' + kop + ' L ' + (-dik*2.2) + ' ' + (kop + dik*2.6) + ' L ' + (dik*2.2) + ' ' + (kop + dik*2.6) + ' Z" fill="' + kleur + '"/></g>';
    }
    var svg = "";
    for (var y = 60; y < H; y += 105) for (var x = 60; x < W; x += 120) svg += arrow(x, y, naar, 34 + u.kn*1.2, "#FFFFFF", 3, .55);
    svg += '<circle cx="' + W/2 + '" cy="' + H/2 + '" r="58" fill="rgba(23,19,15,.28)"/>' + arrow(W/2, H/2, naar, 96, kl, 9);
    var b = blokBij(u.t);
    if (b && b.stroom && b.stroom.kn >= 0.08) {
      var c = stroomC(b, u.dir), skl = c > 0.15 ? "#8FE0B8" : c < -0.15 ? "#F5B27A" : "#8FC7F0";
      svg += '<circle cx="130" cy="' + (H-90) + '" r="46" fill="rgba(23,19,15,.35)"/>' + arrow(130, H-90, b.stroom.naar, 50 + Math.min(70, b.stroom.kn*70), skl, 5);
      svg += '<text x="130" y="' + (H-26) + '" text-anchor="middle" font-size="13" font-weight="700" fill="#FFF">stroming ' + b.stroom.kn.toFixed(1) + ' kn ' + (c > 0.15 ? "tegen" : c < -0.15 ? "mee" : "dwars") + '</text>';
    }
    if (u.golf) {
      svg += '<circle cx="' + (W-130) + '" cy="' + (H-90) + '" r="46" fill="rgba(23,19,15,.35)"/>' + arrow(W-130, H-90, u.golf.dir + 180, 40 + Math.min(60, u.golf.m*40), "#DCE9F2", 4);
      svg += '<text x="' + (W-130) + '" y="' + (H-26) + '" text-anchor="middle" font-size="13" font-weight="700" fill="#FFF">golven ' + u.golf.m.toFixed(1) + ' m</text>';
    }
    svg += '<g transform="translate(' + (W-40) + ',44)"><circle r="18" fill="rgba(23,19,15,.45)"/><path d="M0 -12 L6 6 L0 2 L-6 6 Z" fill="#FFF"/><text y="26" text-anchor="middle" font-size="11" font-weight="700" fill="#FFF">N</text></g>';
    $("pijlen").innerHTML = svg;

    var hw = hoekWoord(hoekTussen(u.dir, s.onshore), s, u), so = stroomOordeel(b, u), go = golfOordeel(u.golf);
    $("scenenote").textContent = "— " + dagStr(u.t) + " " + uurStr(u.t) + ", " + s.naam;
    var idx = d.uren.map(function (x) { return x.t; }).indexOf(u.t);
    $("schuif").max = d.uren.length - 1; $("schuif").value = Math.max(0, idx);
    $("schuiflabels").innerHTML = d.uren.map(function (x) { return '<i style="background:' + KLEUR[niveau(x)] + '"></i>'; }).join("");
    $("schuifuur").textContent = uurStr(u.t);
    $("scenelabel").innerHTML = '<b style="color:' + kl + '">' + u.kn + ' kn</b><span>vlagen ' + u.vl + ' · uit ' + kompas(u.dir) + '</span>' +
      '<span>' + WOORD[n] + ((n !== "weinig" && n !== "aflandig") ? " · kite " + kiteBereik(u.kn, u.kn, u.vl) : "") + '</span>';
    $("sceneuitleg").innerHTML = [["Wind", n, hw], ["Stroming", so.niveau, so], ["Golven", go.niveau, go]].map(function (x) {
      return '<div class="oordeel" style="--tint:' + tint(x[1]) + ';--tint-v:' + tintV(x[1]) + '"><span class="okop">' + x[0] + '</span><b>' + x[2].kop + '</b><ul>' +
        x[2].punten.map(function (p) { return "<li>" + p + "</li>"; }).join("") + '</ul></div>'; }).join("");
  }

  // ── nu gemeten ───────────────────────────────────────
  function tekenNu() {
    var s = spot();
    if (!s.metingen || !s.metingen.length || st.dag !== 0) { $("nu").hidden = true; return; }
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
    var ds = dagen(), d = huidigeDag(), s = spot(), o = dagOordeel(d), i = ds.indexOf(d);
    var beste = null, besteDag = null;
    ds.forEach(function (x) { var ox = dagOordeel(x);
      if (ox.v && (!beste || RANG[ox.n] < RANG[beste.n] || (RANG[ox.n] === RANG[beste.n] && ox.v.uren.length > beste.uren.length))) { beste = ox.v; besteDag = x; } });
    $("hero").style.setProperty("--tint", tint(o.n));
    $("kicker").textContent = (i === 0 ? "vandaag, " : "") + dagLang(d.uren[0].t) + " · " + s.naam;
    var zon = "zon op " + d.zon.op + ", onder " + d.zon.onder;
    if (o.v) {
      $("verdict").textContent = o.ws.length + (o.ws.length === 1 ? " venster" : " vensters") + " · " + WOORD[o.n];
      $("vensterlijst").innerHTML = o.ws.map(function (w, j) {
        var c = cijfer(w);
        return '<button type="button" class="venster" data-venster="' + j + '" style="--tint:' + tint(w.n) + ';--tint-v:' + tintV(w.n) + '">' +
          '<span class="vt">' + w.tekst + '</span><span class="vk">' + w.lo + "–" + w.hi + ' kn</span><span class="vkite">kite ' + kiteBereik(w.lo, w.hi, vlMax(w.uren)) + '</span>' +
          '<span class="vc">' + c.score.toString().replace(".", ",") + '</span><span class="veen">' + c.een + '</span><i class="info" aria-hidden="true">i</i></button>';
      }).join("");
      $("onderverdict").innerHTML = '<span class="flauw">' + zon + (i >= 3 ? " · indicatie, voorbij 2 dagen kijkt alleen het grove model" : "") + '</span>';
    } else {
      $("verdict").textContent = o.n === "aflandig" ? "Aflandig, niet gaan" : o.n === "matig" ? "Matig, " + o.b.kn + " kn" : "Geen kitewind";
      $("vensterlijst").innerHTML = "";
      $("onderverdict").innerHTML = (o.n === "matig" ? "wel te doen met een grote kite (" + kiteBereik(o.b.kn, o.b.kn, o.b.vl) + "), rond " + uurStr(o.b.t) : "hoogste " + o.b.kn + " kn om " + uurStr(o.b.t)) +
        (beste && besteDag !== d ? ' · <b>beste moment deze week: ' + dagLang(besteDag.uren[0].t) + " " + beste.tekst + ", " + beste.lo + "–" + beste.hi + " kn</b>" : "") +
        '<br><span class="flauw">' + zon + '</span>';
    }
  }

  // ── welke dag ────────────────────────────────────────
  function tekenWeek() {
    var ds = dagen();
    $("weekstrip").innerHTML = ds.map(function (d, i) {
      var o = dagOordeel(d);
      return '<button type="button" class="dagkaart' + (i === st.dag ? " aan" : "") + '" data-dag="' + i + '" aria-pressed="' + (i === st.dag) +
        '" style="--tint:' + tint(o.n) + ';--tint-v:' + tintV(o.n) + '"><span class="dk">' + (i === 0 ? "vandaag" : dagStr(d.uren[0].t)) + '</span>' +
        '<span class="dv">' + (o.v ? o.v.lo + "–" + o.v.hi : o.b.kn) + ' <em>kn</em></span>' +
        '<span class="dn">' + (o.v ? o.ws.map(function (w) { return w.tekst; }).join("<br>") : WOORD[o.n]) + '</span>' +
        '<span class="ind">' + (function () { var u = d.uren[Math.floor(d.uren.length/2)], fijn = st.modellen.filter(function (m) { return MODEL[m].klasse === "regionaal" && KWU.spots[st.spot].modellen[m][KWU.spots[st.spot].uren.map(function (x) { return x.t; }).indexOf(u.t)]; }).length;
          return u.nModellen + " modellen" + (fijn ? ", " + fijn + " fijn" : " · alleen grof") + (i >= 3 ? " · indicatie" : ""); })() + '</span></button>';
    }).join("") + (ds.length < 7 ? '<div class="dagkaart leeg"><span class="dk">verder</span><span class="dn">de gekozen modellen kijken niet verder dan ' + ds.length + ' dagen</span></div>' : '');
  }

  // ── uur voor uur: één dag, tabel zoals Windfinder ────
  function tekenDag() {
    var ds = dagen(), d = huidigeDag(), i = ds.indexOf(d), o = dagOordeel(d);
    $("uurnote").textContent = "— klik een kolom, de strandkaart en het kite-advies volgen";
    var kop = '<div class="dagkop" style="--tint:' + tint(o.n) + '"><b>' + (i === 0 ? "vandaag, " : "") + dagLang(d.uren[0].t) + '</b>' +
      '<span class="dagv">' + (o.v ? o.ws.length + (o.ws.length === 1 ? " venster" : " vensters") + " · " + WOORD[o.n] : WOORD[o.n]) + '</span>' +
      '<span class="ind">zon op ' + d.zon.op + ', onder ' + d.zon.onder + (i >= 3 ? ' · indicatie, verder dan 2 dagen kijkt alleen het grove model' : '') + '</span></div>';
    var td = function (u, cls, inhoud, style) { return '<td class="' + cls + (u.t === st.t ? " aan" : "") + '" data-t="' + u.t + '"' + (style ? ' style="' + style + '"' : '') + '>' + inhoud + '</td>'; };
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
      return '<tr class="vrij"><th scope="row">venster</th>' + cells + '</tr>';
    })();
    var tabel = '<table class="uurtabel"><tbody>' + (o.v ? vensterRij : "") +
      rij("uur", function (u) { return td(u, "tu", '<button type="button">' + u.t.slice(11,13) + '</button>'); }) +
      rij("richting", function (u) { return td(u, "", pijl(u.dir, niveau(u) === "aflandig" ? KLEUR.aflandig : "#17130F")); }) +
      rij("wind kn", function (u) { return td(u, "tw", '<span class="staaf" style="height:' + Math.round(u.kn/max*44) + 'px;background:' + KLEUR[niveau(u)] + '"></span><b>' + u.kn + '</b>'); }) +
      rij("vlagen", function (u) { var n = niveau(u), g = n === "aflandig" ? "aflandig" : band(u.vl); return td(u, "tv", u.vl, "--tint:" + tint(g) + ";--tint-v:" + tintV(g)); }) +
      rij("", function (u) { return td(u, "tn", '<i style="background:' + KLEUR[niveau(u)] + '"></i>'); }) +
      rij("modellen eens", function (u) { if (!u.nModellen) return td(u, "tm", '<small>—</small>');
        var k = u.kans, kl = k >= 80 ? "perfect" : k >= 50 ? "goed" : k >= 25 ? "matig" : "weinig";
        return td(u, "tm", '<span class="kans" style="--tint:' + tint(kl) + ';--tint-v:' + tintV(kl) + '">' + k + '%</span><small>' + u.knLo + "–" + u.knHi + ' kn</small>'); }) +
      rij("stroming", function (u) { var b = blokBij(u.t), c = stroomC(b, u.dir);
        return td(u, "ts", b && b.stroom ? pijl(b.stroom.naar + 180, c > 0.15 ? KLEUR.perfect : c < -0.15 ? KLEUR.matig : "#41607A") + '<small>' + b.stroom.kn.toFixed(1) + ' kn</small><small style="color:' + (c > 0.15 ? KLEUR.perfect : c < -0.15 ? KLEUR.matig : "#41607A") + '">' + (c > 0.15 ? "tegen" : c < -0.15 ? "mee" : "dwars") + '</small>' : '<small>—</small>'); }) +
      rij("golven", function (u) { return td(u, "tg", u.golf ? '<span>' + u.golf.m.toFixed(1) + ' m</span><small>' + u.golf.s + ' s</small>' : '<small>—</small>'); }) +
      rij("weer", function (u) { var w = weer(u.wx); return td(u, "tx", '<span>' + w[0] + '</span><small>' + u.temp + '°</small>'); }) +
      rij("regen mm/u", function (u) { var d = druppels(u.mm); return td(u, "tr", d ? '<span class="drup">' + "💧".repeat(d) + '</span><small>' + u.mm + '</small>' : '<small class="droog">droog</small>'); }) +
      '</tbody></table>';
    $("dagen").innerHTML = '<div class="dag">' + kop + '<div class="scroll">' + tabel + '</div></div>';
    $("legenda").innerHTML = ["perfect","goed","matig","weinig","aflandig"].map(function (k) {
      return '<span class="lg"><i style="background:' + tint(k) + '"></i>' + WOORD[k] + (k === "perfect" ? " 20–30" : k === "goed" ? " 15–20" : k === "matig" ? " 12–15" : k === "weinig" ? " &lt;12" : "") + '</span>'; }).join("") +
      '<span class="lg">pijl = waar wind of stroom heen gaat</span><span class="lg">modellen eens = gewogen deel van de modellen dat zegt: genoeg wind uit een veilige hoek; eronder laagste–hoogste</span><span class="lg">stroming: sterkte in kn, tegen de wind = goed (gratis hoogte), mee = je zakt af</span><span class="lg">💧 = licht · 💧💧💧 = 1 mm/u · 💧×5 = plensbui</span>';
  }

  function openVenster(j) {
    var d = huidigeDag(), w = dagOordeel(d).ws[j]; if (!w) return;
    var c = cijfer(w);
    $("sheet-t").textContent = dagStr(w.uren[0].t) + " " + w.tekst + " · " + c.score.toString().replace(".", ",");
    $("sheet-b").innerHTML = '<p class="sheet-een">' + c.een + '</p><ul class="redenen">' +
      c.plus.map(function (p) { return '<li class="p">' + p + '</li>'; }).join("") + c.min.map(function (p) { return '<li class="m">' + p + '</li>'; }).join("") + '</ul>' +
      [["wind", w.lo + "–" + w.hi + " kn uit " + kompas(top(w.uren).dir)], ["vlagen tot", Math.max.apply(null, w.uren.map(function (u) { return u.vl; })) + " kn"],
       ["duur", w.uren.length + " uur"], ["kite", kiteBereik(w.lo, w.hi, vlMax(w.uren)) + " bij " + st.kg + " kg, " + st.board + ". Maat op de gemiddelde wind; vlagen tot " + vlMax(w.uren) + " kn" + (vlMax(w.uren) / w.hi >= 1.5 ? ", dat is 1,5× de wind: neem de kleine" : ", dat kan de kite hebben")],
       ["cijfer", c.som],
       ["modellen", st.modellen.length + " aangevinkt, gewogen middelste waarde per uur (Arthurs skill-gewichten, regionaal/globaal 50/50)"]
      ].map(function (r) { return '<div class="rij"><span>' + r[0] + '</span><span>' + r[1] + '</span></div>'; }).join("");
    $("sheet").hidden = false; $("sheet-x").focus();
  }
  function openModellen() {
    var fijn = KWU.modellen.filter(function (m) { return m.klasse === "regionaal"; }), grof = KWU.modellen.filter(function (m) { return m.klasse === "globaal"; });
    $("sheet-t").textContent = "Hoe de wind wordt berekend";
    $("sheet-b").innerHTML =
      '<p class="sheet-een">Elk model doet zijn eigen voorspelling per uur. De pagina neemt daarvan de <b>gewogen middelste waarde</b>: het model dat vaker goed zat weegt zwaarder.</p>' +
      '<ul class="redenen">' +
      '<li class="p"><b>Fijn</b> (2 km, ziet de kust): ' + fijn.map(function (m) { return m.naam.split(" ")[0] + " ×" + m.w.toString().replace(".", ","); }).join(", ") + '. Reiken 2 dagen, daarna vallen ze vanzelf weg.</li>' +
      '<li class="p"><b>Grof</b> (7–25 km, hele wereld): ' + grof.map(function (m) { return m.naam.split(" ")[0]; }).join(", ") + '. Reiken 7 dagen.</li>' +
      '<li class="p"><b>AJK-mix</b>: fijn en grof tellen samen 50/50 (Arthurs besluit, zodat vier fijne modellen niet vanzelf de meerderheid zijn). De gewichten ×1,16 … ×0,88 zijn gemeten: een jaar lang, 9 KNMI-stations, 78.000 vergelijkingen.</li>' +
      '<li class="p"><b>DJK-mix</b>: alleen fijn zolang het reikt (2 dagen), daarna grof.</li>' +
      '<li class="p"><b>Toets 30-08 t/m 05-09</b> tegen KNMI Hoek van Holland, 84 daglichturen: fijn-mix 1,3 kn te laag · AJK 3,0 te laag · grof 3,8 te laag · AROME-HD +0,8 (beste) · ECMWF 6,0 te laag. Maandag 31-08 09:00 mat het station 23 kn, geen model zat boven 20.</li>' +
      '<li class="m">Voorbij 2 dagen is alles grof: een indicatie, geen plan.</li>' +
      '<li class="m">Het model is niet de grootste fout. Zelfde model, andere plek: tot 5 kn verschil. Zandmotor heeft geen eigen meetstation; "nu gemeten" is Hoek van Holland, 12 km verderop.</li></ul>' +
      '<div class="rij"><span>modellen eens</span><span>gewogen deel dat zegt: genoeg wind uit een veilige hoek</span></div>' +
      '<div class="rij"><span>bron</span><span>ajk68.com/kiteweer, SPEC §6 en §13</span></div>';
    $("sheet").hidden = false; $("sheet-x").focus();
  }
  function sluit() { $("sheet").hidden = true; }

  // ── modellen-keuze ───────────────────────────────────
  function tekenModellen() {
    var alle = KWU.modellen.map(function (m) { return m.id; });
    var zelfde = function (a, b) { return a.slice().sort().join() === b.slice().sort().join(); };
    var FIJN = KWU.modellen.filter(function (m) { return m.klasse === "regionaal"; }).map(function (m) { return m.id; });
    var GROF = KWU.modellen.filter(function (m) { return m.klasse === "globaal" && m.arthur; }).map(function (m) { return m.id; });
    var knop = function (id, lbl, set, title, mix) { return '<button type="button" data-mset="' + id + '" title="' + title + '" class="' + (zelfde(st.modellen, set) && (!mix || st.mix === mix) ? "on" : "") + '">' + lbl + '</button>'; };
    var d = huidigeDag(), nd = d.uren[Math.floor(d.uren.length/2)].nModellen;
    $("modellen").innerHTML = '<div class="mkop"><b>Windmodellen</b><span>voor deze dag doen er <b>' + nd + '</b> mee <button type="button" class="info" data-info="modellen" aria-label="uitleg modellen">i</button></span>' +
      '<span class="mknoppen">' + knop("arthur", "AJK-mix", ARTHUR, "fijn en grof 50/50, gewogen op gemeten trefzekerheid; wordt vanzelf grof na 2 dagen", "ajk") +
      knop("djk", "DJK-mix", ARTHUR, "fijn zolang het reikt (2 dagen), daarna grof; zat afgelopen week het dichtst bij de meting", "djk") +
      knop("fijn", "alleen fijn, 2 dagen", FIJN, "de vier 2 km-modellen, zoals Windfinder Superforecast") +
      knop("grof", "alleen grof, 7 dagen", GROF, "ECMWF, GFS, ICON wereldwijd") +
      knop("alle", "alle 8", alle, "ook ARPEGE, dat AJK niet gebruikt") + '</span></div>' +
      '<div class="mchips">' + KWU.modellen.map(function (m) {
        var aan = st.modellen.indexOf(m.id) >= 0;
        return '<button type="button" class="mchip' + (aan ? " aan" : "") + '" data-model="' + m.id + '" aria-pressed="' + aan + '">' + esc(m.naam) + '<small>' + m.dagen + ' dag</small></button>'; }).join("") + '</div>';
  }

  function tekenSpotkeuze() {
    $("spotkeuze").innerHTML = KW.spots.map(function (s) { return '<button type="button" class="' + (s.id === st.spot ? "on" : "") + '" data-spot="' + s.id + '">' + esc(s.naam) + '</button>'; }).join("");
  }
  function teken() { tekenSpotkeuze(); tekenHero(); tekenNu(); tekenModellen(); tekenWeek(); tekenDag(); tekenScene(); }

  document.addEventListener("click", function (e) {
    var sp = e.target.closest("[data-spot]"); if (sp) { st.spot = sp.dataset.spot; st.t = null; return teken(); }
    var bd = e.target.closest("[data-board]");
    if (bd) { bd.parentNode.querySelectorAll("button").forEach(function (b) { b.classList.remove("on"); }); bd.classList.add("on"); st.board = bd.dataset.board; return teken(); }
    var ms = e.target.closest("[data-mset]");
    if (ms) { var k = ms.dataset.mset;
      st.mix = k === "djk" ? "djk" : "ajk";
      st.modellen = k === "alle" ? KWU.modellen.map(function (m) { return m.id; }) : k === "geen" ? []
        : k === "fijn" ? KWU.modellen.filter(function (m) { return m.klasse === "regionaal"; }).map(function (m) { return m.id; })
        : k === "grof" ? KWU.modellen.filter(function (m) { return m.klasse === "globaal" && m.arthur; }).map(function (m) { return m.id; })
        : ARTHUR.slice();
      st.t = null; return teken(); }
    var mc = e.target.closest("[data-model]");
    if (mc) { var id = mc.dataset.model, ix = st.modellen.indexOf(id); if (ix >= 0) { if (st.modellen.length > 1) st.modellen.splice(ix,1); } else st.modellen.push(id); st.t = null; return teken(); }
    if (e.target.closest("[data-info=\"modellen\"]")) return openModellen();
    var vn = e.target.closest("[data-venster]"); if (vn) return openVenster(+vn.dataset.venster);
    if (e.target.id === "sheet-x" || e.target.id === "sheet") return sluit();
    var dg = e.target.closest("[data-dag]"); if (dg) { st.dag = +dg.dataset.dag; st.t = null; return teken(); }
    var bl = e.target.closest("[data-t]"); if (bl) { st.t = bl.dataset.t; return teken(); }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("sheet").hidden) sluit(); });
  $("schuif").addEventListener("input", function (e) { st.t = huidigeDag().uren[+e.target.value].t; teken(); });
  $("kg").addEventListener("input", function (e) { var v = parseInt(e.target.value,10); if (v >= 40 && v <= 140) { st.kg = v; teken(); } });

  $("ververst").textContent = "ververst " + new Date(KWU.gegenereerd).toLocaleString("nl-NL");
  teken();
})();
