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

  var st = { board:"twintip", kg:85, kites:KW.rider.kites.slice(), spot:KW.spots[0].id, dag:0, t:null };
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

  /* ── dagen: alleen de uren tussen zon op en zon onder ── */
  function dagen() {
    var sp = KWU.spots[st.spot], map = {}, volg = [];
    sp.uren.forEach(function (u) {
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
    var h = g.m, kop = h < 0.4 ? "Vlak water" : h < 0.8 ? "Kleine golfjes" : h < 1.5 ? "Golven" : "Flinke golven";
    var p = [];
    if (g.chop >= 0.2) p.push("windchop " + g.chop.toFixed(1) + " m, korte hakkerige golfjes (om de " + g.chopS + " s)");
    if (g.swell >= 0.2) p.push("deining " + g.swell.toFixed(1) + " m uit " + kompas(g.swellDir) + ", lange glooiende golven (om de " + g.swellS + " s)" + (g.swellS >= 8 ? ": lekker om te springen" : ""));
    else p.push("geen deining, alleen wat de wind zelf maakt");
    p.push(h < 0.4 ? "ideaal om te leren en voor freestyle" : h < 0.8 ? "prima om te rijden" : h < 1.5 ? "leuk om te springen" : "groot, alleen als je dat leuk vindt");
    return { niveau: h < 0.8 ? "perfect" : h < 1.5 ? "goed" : "matig", kop: kop + ", " + h.toFixed(1) + " m", punten:p };
  }

  /* ── kitemaat ──────────────────────────────────────
     ideaal = 2,2 x kg / knopen x boardfactor. Per kite uit JOUW quiver zeggen we hoe hij staat. */
  function ideaal(kn) { return 2.2 * st.kg / kn * KW.rider.boards[st.board]; }
  function staat(maat, kn) {
    var r = maat / ideaal(kn);
    return r > 1.22 ? "over" : r > 1.08 ? "iets over" : r < 0.80 ? "te klein" : r < 0.93 ? "iets under" : "goed";
  }
  /* Welke maat past bij een windbereik: afgerond op hele meters, hoog naar laag. */
  function kiteBereik(lo, hi) {
    var a = Math.round(ideaal(hi)), b = Math.round(ideaal(lo));
    return a === b ? a + " m" : a + "–" + b + " m";
  }

  /* ── cijfer voor een venster: wind, stabiliteit, stroming, golven, lengte ── */
  function cijfer(v) {
    var us = v.uren, n = us.length, pl = [], mn = [], score = v.n === "perfect" ? 8 : 7;
    var vl = us.reduce(function (a,u) { return a + (u.vl - u.kn); }, 0) / n;
    if (vl >= 10) { score -= 1.5; mn.push("vlagerig"); } else if (vl < 6) { score += 0.5; pl.push("stabiele wind"); }
    var c = us.reduce(function (a,u) { return a + stroomC(blokBij(u.t), u.dir); }, 0) / n;
    if (c > 0.3) { score += 0.5; pl.push("stroom tegen de wind, gratis hoogte"); } else if (c < -0.5) { score -= 0.5; mn.push("stroom mee, je zakt af"); }
    var g = us.filter(function (u) { return u.golf; }); var gm = g.length ? g.reduce(function (a,u) { return a + u.golf.m; }, 0) / g.length : null;
    if (gm != null) { if (gm > 1.5) { score -= 0.5; mn.push("flinke golven " + gm.toFixed(1) + " m"); } else if (gm < 0.5) pl.push("vlak water"); }
    var mm = us.reduce(function (a,u) { return a + (u.mm||0); }, 0);
    if (mm >= 2) { score -= 0.5; mn.push("regen"); }
    if (n >= 4) pl.push(n + " uur lang"); else if (n <= 1) { score -= 1; mn.push("maar 1 uur"); }
    score = Math.max(1, Math.min(10, Math.round(score * 2) / 2));
    return { score:score, plus:pl, min:mn, een: (v.n === "perfect" ? "Perfecte wind" : "Goede wind") + (pl.length ? ", " + pl[0] : "") + (mn.length ? ", maar " + mn[0] : "") };
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
      '<span>' + WOORD[n] + ((n !== "weinig" && n !== "aflandig") ? " · kite " + kiteBereik(u.kn, u.kn) : "") + '</span>';
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
          '<span class="vt">' + w.tekst + '</span><span class="vk">' + w.lo + "–" + w.hi + ' kn</span><span class="vkite">kite ' + kiteBereik(w.lo, w.hi) + '</span>' +
          '<span class="vc">' + c.score.toString().replace(".", ",") + '</span><span class="veen">' + c.een + '</span><i class="info" aria-hidden="true">i</i></button>';
      }).join("");
      $("onderverdict").innerHTML = '<span class="flauw">' + zon + (i >= 3 ? " · indicatie, voorbij 2 dagen kijkt alleen het grove model" : "") + '</span>';
    } else {
      $("verdict").textContent = o.n === "aflandig" ? "Aflandig, niet gaan" : "Geen kitewind";
      $("vensterlijst").innerHTML = "";
      $("onderverdict").innerHTML = "hoogste " + o.b.kn + " kn om " + uurStr(o.b.t) +
        (beste && besteDag !== d ? ' · <b>beste moment deze week: ' + dagLang(besteDag.uren[0].t) + " " + beste.tekst + ", " + beste.lo + "–" + beste.hi + " kn</b>" : "") +
        '<br><span class="flauw">' + zon + '</span>';
    }
  }

  // ── welke dag ────────────────────────────────────────
  function tekenWeek() {
    $("weekstrip").innerHTML = dagen().map(function (d, i) {
      var o = dagOordeel(d);
      return '<button type="button" class="dagkaart' + (i === st.dag ? " aan" : "") + '" data-dag="' + i + '" aria-pressed="' + (i === st.dag) +
        '" style="--tint:' + tint(o.n) + ';--tint-v:' + tintV(o.n) + '"><span class="dk">' + (i === 0 ? "vandaag" : dagStr(d.uren[0].t)) + '</span>' +
        '<span class="dv">' + (o.v ? o.v.lo + "–" + o.v.hi : o.b.kn) + ' <em>kn</em></span>' +
        '<span class="dn">' + (o.v ? o.ws.map(function (w) { return w.tekst; }).join("<br>") : WOORD[o.n]) + '</span>' +
        (i >= 3 ? '<span class="ind">indicatie</span>' : '') + '</button>';
    }).join("");
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
        if (w) { cells += '<td colspan="' + w.uren.length + '"><span class="vpil" style="--tint:' + tint(w.n) + ';--tint-v:' + tintV(w.n) + '">' + w.tekst + " · " + WOORD[w.n] + '</span></td>'; k += w.uren.length; }
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
      rij("stroming", function (u) { var b = blokBij(u.t), c = stroomC(b, u.dir);
        return td(u, "ts", b && b.stroom ? pijl(b.stroom.naar + 180, c > 0.15 ? KLEUR.perfect : c < -0.15 ? KLEUR.matig : "#41607A") + '<small>' + b.stroom.kn.toFixed(1) + ' kn</small><small style="color:' + (c > 0.15 ? KLEUR.perfect : c < -0.15 ? KLEUR.matig : "#41607A") + '">' + (c > 0.15 ? "tegen" : c < -0.15 ? "mee" : "dwars") + '</small>' : '<small>—</small>'); }) +
      rij("golven", function (u) { return td(u, "tg", u.golf ? '<span>' + u.golf.m.toFixed(1) + ' m</span><small>' + u.golf.s + ' s</small>' : '<small>—</small>'); }) +
      rij("weer", function (u) { var w = weer(u.wx); return td(u, "tx", '<span>' + w[0] + '</span><small>' + u.temp + '°</small>'); }) +
      rij("regen mm/u", function (u) { var d = druppels(u.mm); return td(u, "tr", d ? '<span class="drup">' + "💧".repeat(d) + '</span><small>' + u.mm + '</small>' : '<small class="droog">droog</small>'); }) +
      '</tbody></table>';
    $("dagen").innerHTML = '<div class="dag">' + kop + '<div class="scroll">' + tabel + '</div></div>';
    $("legenda").innerHTML = ["perfect","goed","matig","weinig","aflandig"].map(function (k) {
      return '<span class="lg"><i style="background:' + tint(k) + '"></i>' + WOORD[k] + (k === "perfect" ? " 20–30" : k === "goed" ? " 15–20" : k === "matig" ? " 12–15" : k === "weinig" ? " &lt;12" : "") + '</span>'; }).join("") +
      '<span class="lg">pijl = waar wind of stroom heen gaat</span><span class="lg">stroming: sterkte in kn, tegen de wind = goed (gratis hoogte), mee = je zakt af</span><span class="lg">💧 = licht · 💧💧💧 = 1 mm/u · 💧×5 = plensbui</span>';
  }

  function openVenster(j) {
    var d = huidigeDag(), w = dagOordeel(d).ws[j]; if (!w) return;
    var c = cijfer(w);
    $("sheet-t").textContent = dagStr(w.uren[0].t) + " " + w.tekst + " · " + c.score.toString().replace(".", ",");
    $("sheet-b").innerHTML = '<p class="sheet-een">' + c.een + '</p><ul class="redenen">' +
      c.plus.map(function (p) { return '<li class="p">' + p + '</li>'; }).join("") + c.min.map(function (p) { return '<li class="m">' + p + '</li>'; }).join("") + '</ul>' +
      [["wind", w.lo + "–" + w.hi + " kn uit " + kompas(top(w.uren).dir)], ["vlagen tot", Math.max.apply(null, w.uren.map(function (u) { return u.vl; })) + " kn"],
       ["duur", w.uren.length + " uur"], ["kite", kiteBereik(w.lo, w.hi) + " bij " + st.kg + " kg, " + st.board],
       ["cijfer", "start " + (w.n === "perfect" ? 8 : 7) + " voor " + WOORD[w.n] + " wind, dan plus/min voor vlagen, stroming, golven, regen en lengte"]
      ].map(function (r) { return '<div class="rij"><span>' + r[0] + '</span><span>' + r[1] + '</span></div>'; }).join("");
    $("sheet").hidden = false; $("sheet-x").focus();
  }
  function sluit() { $("sheet").hidden = true; }

  function tekenSpotkeuze() {
    $("spotkeuze").innerHTML = KW.spots.map(function (s) { return '<button type="button" class="' + (s.id === st.spot ? "on" : "") + '" data-spot="' + s.id + '">' + esc(s.naam) + '</button>'; }).join("");
  }
  function teken() { tekenSpotkeuze(); tekenNu(); tekenHero(); tekenWeek(); tekenDag(); tekenScene(); }

  document.addEventListener("click", function (e) {
    var sp = e.target.closest("[data-spot]"); if (sp) { st.spot = sp.dataset.spot; st.t = null; return teken(); }
    var bd = e.target.closest("[data-board]");
    if (bd) { bd.parentNode.querySelectorAll("button").forEach(function (b) { b.classList.remove("on"); }); bd.classList.add("on"); st.board = bd.dataset.board; return teken(); }
    var vn = e.target.closest("[data-venster]"); if (vn) return openVenster(+vn.dataset.venster);
    if (e.target.id === "sheet-x" || e.target.id === "sheet") return sluit();
    var dg = e.target.closest("[data-dag]"); if (dg) { st.dag = +dg.dataset.dag; st.t = null; return teken(); }
    var bl = e.target.closest("[data-t]"); if (bl) { st.t = bl.dataset.t; return teken(); }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("sheet").hidden) sluit(); });
  $("schuif").addEventListener("input", function (e) { st.t = huidigeDag().uren[+e.target.value].t; teken(); });
  $("kg").addEventListener("input", function (e) { var v = parseInt(e.target.value,10); if (v >= 40 && v <= 140) { st.kg = v; teken(); } });

  $("ververst").textContent = "ververst " + new Date(KWU.gegenereerd).toLocaleString("nl-NL") + " · " + KWU.bron;
  teken();
})();
