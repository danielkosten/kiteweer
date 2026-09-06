/* Kiteweer — vijf niveaus, één kleur per niveau, verder geen kleur.
   perfect · goed · matig · te weinig · aflandig
   Aflandig telt alleen boven RIJDBAAR: aflandig bij 4 knopen is geen gevaar maar geen wind. */

(function () {
  "use strict";

  var RIJDBAAR = KW.rijdbaar || 12;
  var DAGL = ["zondag","maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag"];
  var DAGK = ["zo","ma","di","wo","do","vr","za"];
  var KOMPAS = ["N","NNO","NO","ONO","O","OZO","ZO","ZZO","Z","ZZW","ZW","WZW","W","WNW","NW","NNW"];

  var st = { per:"vandaag", board:"twintip", kg:85, kites:KW.rider.kites.slice(), spot:KW.spots[0].id, dag:0, blok:null };
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) {
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); };

  function kompas(d) { return KOMPAS[Math.round(((d%360)+360)%360/22.5)%16]; }

  /* ── de vijf niveaus ────────────────────────────────
     Het oordeel hangt aan de MID-wind, behalve aflandig: dat overrulet alles
     zodra er genoeg wind staat om te gaan. */
  function niveau(b) {
    if (!b) return "weinig";
    if (b.aflandig && b.mid >= RIJDBAAR) return "aflandig";
    if (b.mid < RIJDBAAR) return "weinig";
    if (b.mid < 15) return "matig";
    if (b.mid < 20) return "goed";
    if (b.mid <= 30) return "perfect";
    return "matig";                       // boven 30 wordt het weer werk
  }
  var WOORD = { perfect:"perfect", goed:"goed", matig:"matig", weinig:"te weinig wind", aflandig:"aflandig" };
  var RANG  = { perfect:0, goed:1, matig:2, weinig:3, aflandig:4 };
  function tint(n) { return "var(--" + n + ")"; }
  function tintV(n) { return "var(--" + n + "-v)"; }

  /* ── kitemaat ──────────────────────────────────────
     ideaal = 2,2 x kg / knopen x boardfactor. Daarna zoeken we in JOUW quiver
     de kite die daar het dichtst bij zit, en zeggen hoe die dan staat. */
  function ideaal(kn) { return 2.2 * st.kg / kn * KW.rider.boards[st.board]; }
  function kiesKite(kn) {
    var i = ideaal(kn);
    if (!st.kites.length) return { maat:Math.round(i*2)/2, staat:"ideaal", ratio:1 };
    var beste = st.kites.slice().sort(function (a,b) {
      return Math.abs(Math.log(a/i)) - Math.abs(Math.log(b/i)); })[0];
    var r = beste / i;
    var staat = r > 1.22 ? "flink overpowered"
              : r > 1.08 ? "iets overpowered"
              : r < 0.80 ? "te weinig kite"
              : r < 0.93 ? "iets underpowered"
              : "precies goed";
    return { maat:beste, staat:staat, ratio:r };
  }

  function spot() { return KW.spots.filter(function (s) { return s.id === st.spot; })[0]; }
  function reeks(s) { return (st.per === "demo" ? s.demoUur : s.blokken) || []; }

  function dagen(s) {
    var map = {}, volg = [];
    reeks(s).forEach(function (b) {
      var d = new Date(b.t), u = d.getHours();
      if (u < 6 || u > 21) return;
      var k = b.t.slice(0,10);
      if (!map[k]) { map[k] = { dag:d, blokken:[] }; volg.push(map[k]); }
      map[k].blokken.push(b);
    });
    return volg;
  }
  function huidigeDag() { var ds = dagen(spot()); return ds[Math.min(st.dag, ds.length-1)]; }

  /* Beste aaneengesloten venster: langste reeks perfect/goed, anders matig. */
  function venster(blokken) {
    var ok = function (b) { var n = niveau(b); return n === "perfect" || n === "goed"; };
    var beste = null, nu = null;
    blokken.forEach(function (b) {
      if (ok(b)) { nu = nu ? {van:nu.van, tot:b, blokken:nu.blokken.concat([b])} : {van:b, tot:b, blokken:[b]};
        if (!beste || nu.blokken.length > beste.blokken.length) beste = nu; }
      else nu = null;
    });
    return beste;
  }
  function top(blokken) { return blokken.reduce(function (a,b) { return b.mid > a.mid ? b : a; }); }
  function draai(bl) {
    var d = bl.filter(function (b) { return b.dir != null; });
    if (d.length < 2) return 0;
    return Math.round(Math.abs(((d[d.length-1].dir - d[0].dir + 540) % 360) - 180));
  }
  function uur(t) { return String(new Date(t).getHours()).padStart(2,"0") + ":00"; }
  function tot(b) { var d = new Date(b.t);
    d.setHours(d.getHours() + (st.per === "demo" ? 1 : 3));
    return String(d.getHours()).padStart(2,"0") + ":00"; }
  function pijl(deg) {
    return '<svg class="wijzer" viewBox="0 0 16 16" style="transform:rotate(' + ((deg+180)%360) +
      'deg)" aria-hidden="true"><path d="M8 1.5l4.2 12-4.2-2.9L3.8 13.5z"/></svg>';
  }

  /* ── kompas per spot: land, zee, veilige sectoren, windpijl ── */
  function kompasSvg(s, dir, kleur) {
    var R = 27, C = 32;
    var pt = function (deg, r) {
      return [(C + r*Math.sin(deg*Math.PI/180)).toFixed(1), (C - r*Math.cos(deg*Math.PI/180)).toFixed(1)];
    };
    var boog = function (van, naar, r, w, kl, op) {
      var sw = (naar - van + 360) % 360, a = pt(van, r), b = pt(naar, r);
      return '<path d="M ' + a[0] + ' ' + a[1] + ' A ' + r + ' ' + r + ' 0 ' + (sw>180?1:0) +
        ' 1 ' + b[0] + ' ' + b[1] + '" fill="none" stroke="' + kl + '" stroke-width="' + w +
        '" opacity="' + op + '" stroke-linecap="round"/>';
    };
    var svg = '<svg class="kompas" viewBox="0 0 64 64" aria-hidden="true">';
    // zee-helft achter de kust
    svg += '<path d="M ' + pt((s.onshore-90+360)%360, R)[0] + ' ' + pt((s.onshore-90+360)%360, R)[1] +
      ' A ' + R + ' ' + R + ' 0 0 1 ' + pt((s.onshore+90)%360, R)[0] + ' ' + pt((s.onshore+90)%360, R)[1] +
      ' Z" fill="#DCE9F2"/>';
    svg += '<circle cx="' + C + '" cy="' + C + '" r="' + R + '" fill="none" stroke="#E7DFD5"/>';
    // veilige sectoren als dikke boog buitenom
    s.vensters.forEach(function (v) { svg += boog(v[0], v[1], R+2.5, 3, "#3E9B6E", ".85"); });
    // windpijl
    if (dir != null) {
      var p = pt(dir, R-5);
      svg += '<line x1="' + C + '" y1="' + C + '" x2="' + p[0] + '" y2="' + p[1] +
        '" stroke="' + kleur + '" stroke-width="3" stroke-linecap="round"/>' +
        '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.6" fill="' + kleur + '"/>';
    }
    return svg + '</svg>';
  }


  /* ── wat de hoek betekent, in gewone woorden ─────── */
  function hoekWoord(hoek) {
    if (hoek > 90) return { kop:"Aflandig", uitleg:"de wind blaast van het strand de zee op. Gaat je kite neer, dan drijf je weg van de kant." };
    if (hoek > 70) return { kop:"Langs het strand", uitleg:"de wind loopt bijna evenwijdig aan de kust. Rijdbaar, maar hou afstand van de kant." };
    if (hoek >= 20) return { kop:"Schuin op het strand", uitleg:"de mooiste hoek: je wordt naar de kant geduwd en kunt makkelijk heen en weer." };
    return { kop:"Recht op het strand", uitleg:"de wind duwt je pal naar de kant. Veilig, maar opstarten en aanlanden is drukker werk." };
  }

  /* ── stroming: niet het getal maar wat het je kost of oplevert ──
     Twee dingen tegelijk. Dwars op de kust = je zakt af en moet terugkruisen.
     Mee of tegen de wind = vlak of hakkerig water. */
  function stroomOordeel(b, onshore) {
    if (!b.stroom || b.stroom.kn < 0.08)
      return { niveau:"perfect", kop:"Geen stroming", uitleg:"het water staat vrijwel stil. Je blijft waar je bent." };
    var kn = b.stroom.kn;
    var windNaar = (b.dir + 180) % 360;                 // waar de wind heen gaat
    var tussen = Math.abs(((b.stroom.naar - windNaar + 540) % 360) - 180);
    var meters = Math.round(kn * 1852);                 // afdrijving per uur
    var water = tussen < 60 ? "Stroom loopt mee met de wind, dat maakt het water vlakker."
              : tussen > 120 ? "Stroom loopt tegen de wind in: kortere, steilere golven."
              : "Stroom loopt dwars op de wind.";
    if (kn < 0.3)
      return { niveau:"goed", kop:"Weinig stroming", uitleg:water + " Je zakt ongeveer " + meters + " m per uur af." };
    if (kn < 0.7)
      return { niveau:"matig", kop:"Merkbare stroming", uitleg:water + " Je zakt ongeveer " + meters + " m per uur af, dus kruis bovenwinds op." };
    return { niveau:"aflandig", kop:"Veel stroming", uitleg:water + " Je zakt ruim " + meters + " m per uur af. Start ruim bovenstrooms." };
  }

  /* ── het strand van bovenaf ──────────────────────────
     Scherm-boven = de zee, scherm-onder = het land. Alles wordt gedraaid naar
     de kust van DEZE spot, zodat de pijlen kloppen met wat je op het strand ziet. */
  function scene(s, b) {
    var W = 720, H = 300, KUST = 196;                    // waterlijn
    var n = niveau(b), kl = { perfect:"#0E7A54", goed:"#3E9B6E", matig:"#C08315",
                              weinig:"#A9A096", aflandig:"#CE4A1F" }[n];
    var theta = ((b.dir - s.onshore) + 540) % 360 - 180; // 0 = pal van zee
    var windNaar = theta + 180;                          // waar de wind heen gaat, op het scherm

    /* Pijl die bij rotate(0) OMHOOG wijst, dus naar de zee. Daarmee is de rotatie
       gelijk aan de kompashoek ten opzichte van de kust: 0 = naar zee, 180 = naar het strand. */
    function arrow(cx, cy, rot, len, kleur, dik) {
      var kop = -len/2;
      return '<g transform="translate(' + cx + ',' + cy + ') rotate(' + rot.toFixed(1) + ')">' +
        '<line x1="0" y1="' + (len/2) + '" x2="0" y2="' + (kop + 13) + '" stroke="' + kleur +
        '" stroke-width="' + dik + '" stroke-linecap="round"/>' +
        '<path d="M 0 ' + kop + ' L ' + (-dik*2.2) + ' ' + (kop + 16) + ' L ' + (dik*2.2) + ' ' +
        (kop + 16) + ' Z" fill="' + kleur + '"/></g>';
    }

    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' +
      "Wind uit " + kompas(b.dir) + ", " + hoekWoord(Math.abs(theta)).kop.toLowerCase() + '">';
    // zee, branding, strand
    svg += '<rect x="0" y="0" width="' + W + '" height="' + KUST + '" fill="#DCE9F2"/>';
    svg += '<rect x="0" y="' + KUST + '" width="' + W + '" height="' + (H-KUST) + '" fill="#F0E6D6"/>';
    for (var i = 0; i < 3; i++)
      svg += '<path d="M 0 ' + (KUST-10-i*13) + ' q 30 -7 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0"' +
             ' fill="none" stroke="#FFFFFF" stroke-width="1.6" opacity="' + (0.5 - i*0.13) + '"/>';
    svg += '<line x1="0" y1="' + KUST + '" x2="' + W + '" y2="' + KUST + '" stroke="#C9BBA4" stroke-width="2"/>';
    svg += '<text x="16" y="26" font-size="12" font-weight="700" fill="#5C7C93" letter-spacing="1.4">ZEE</text>';
    svg += '<text x="16" y="' + (H-14) + '" font-size="12" font-weight="700" fill="#A08E70" letter-spacing="1.4">STRAND</text>';
    // windpijl: door het midden, wijst waar de wind HEEN gaat
    svg += arrow(W/2, 128, windNaar, 150, kl, 7);
    svg += '<text x="' + (W*0.74) + '" y="' + 128 + '" font-size="16" font-weight="700" fill="' + kl + '">' +
           b.lo + '\u2013' + b.hi + ' kn</text>';
    svg += '<text x="' + (W*0.74) + '" y="' + 150 + '" font-size="12.5" font-weight="700" fill="#6B6157">uit ' +
           kompas(b.dir) + '</text>';
    // stroompijl: laag in het water, evenwijdig aan de kust-component
    if (b.stroom && b.stroom.kn >= 0.08) {
      var phi = ((b.stroom.naar - s.onshore) + 540) % 360 - 180;
      var len = 60 + Math.min(70, b.stroom.kn * 70);
      svg += arrow(W*0.22, KUST - 46, phi, len, "#41607A", 4.5);
      svg += '<text x="' + (W*0.22) + '" y="' + (KUST - 12) + '" text-anchor="middle" font-size="12.5" font-weight="700" fill="#41607A">stroming ' +
             b.stroom.kn + ' kn</text>';
    }
    return svg + '</svg>';
  }

  function tekenScene() {
    var s = spot(), d = huidigeDag();
    if (!d) return;
    var b = st.blok ? (d.blokken.filter(function (x) { return x.t === st.blok; })[0] || null) : null;
    if (!b) { var v = venster(d.blokken); b = v ? top(v.blokken) : top(d.blokken); st.blok = b.t; }
    var theta = Math.abs(((b.dir - s.onshore) + 540) % 360 - 180);
    var hw = hoekWoord(theta), so = stroomOordeel(b, s.onshore), n = niveau(b);
    $("scenenote").textContent = "— " + uur(b.t) + ", " + esc(s.naam);
    $("scene").innerHTML = scene(s, b);
    $("sceneuitleg").innerHTML =
      '<div class="oordeel" style="--tint:' + tint(n) + '"><span class="bol"></span><span>' +
        '<b>' + hw.kop + '</b><span>' + hw.uitleg + '</span></span></div>' +
      '<div class="oordeel" style="--tint:' + tint(so.niveau) + '"><span class="bol"></span><span>' +
        '<b>' + so.kop + '</b><span>' + so.uitleg + '</span></span></div>';
  }

  // ── nu gemeten: elk station apart ────────────────────
  function tekenNu() {
    var s = spot();
    if (!s.metingen || !s.metingen.length) { $("nu").hidden = true; return; }
    $("nu").hidden = false;
    var laatste = s.metingen[0].ts;
    $("nu").innerHTML =
      '<div class="nu-kop"><span class="nu-dot" aria-hidden="true"></span>' +
      '<b id="nu-h">Nu gemeten</b>' +
      '<span>' + new Date(laatste).toLocaleTimeString("nl-NL",{hour:"2-digit",minute:"2-digit"}) +
      (s.verwachtNu != null ? " · model zei " + s.verwachtNu + " kn" : "") + '</span></div>' +
      '<div class="stations">' + s.metingen.map(function (m) {
        return '<div class="stn' + (m.standaard ? " hoofd" : "") + '">' +
          '<span class="snaam">' + esc(m.naam) + ' <small>' + m.km + ' km</small></span>' +
          '<span class="swind">' + Math.round(m.wind) + '</span>' +
          (m.vlaag ? '<span class="sdir">/' + Math.round(m.vlaag) + '</span>' : '') +
          (m.dir != null ? '<span class="sdir">' + pijl(m.dir) + kompas(m.dir) + '</span>' : '') +
        '</div>';
      }).join("") + '</div>';
  }

  // ── hero ─────────────────────────────────────────────
  function meter(v, l) { return '<div class="meet"><div class="mv">' + v + '</div><div class="ml">' + l + '</div></div>'; }
  function tekenHero() {
    var s = spot(), d = huidigeDag();
    if (!d) return;
    var v = venster(d.blokken), b = v ? top(v.blokken) : top(d.blokken), n = niveau(b);
    $("hero").style.setProperty("--tint", tint(n));
    $("kicker").textContent = (st.per === "week" ? DAGL[d.dag.getDay()] + " " + d.dag.getDate() + "/" + (d.dag.getMonth()+1)
      : st.per === "demo" ? "maandag 31 augustus" : "vandaag") + " · " + esc(s.naam);

    var k = kiesKite(b.mid);
    if (v) {
      $("verdict").textContent = uur(v.van.t) + "–" + tot(v.tot);
      $("onderverdict").textContent = WOORD[niveau(b)] + " · " + k.maat + " m " + k.staat;
    } else {
      $("verdict").textContent = n === "aflandig" ? "Aflandig" : "Geen kitewind";
      $("onderverdict").textContent = n === "aflandig"
        ? "de wind waait van het strand af" : "hoogste is " + b.mid + " kn rond " + uur(b.t);
    }
    $("meters").innerHTML =
      meter(b.lo + "–" + b.hi + ' <em>kn</em>', "wind") +
      (b.vlaagHi ? meter(b.vlaagLo + "–" + b.vlaagHi + ' <em>kn</em>', "vlagen") : "") +
      meter(kompas(b.dir), "richting") +
      (b.stroom ? meter(b.stroom.kn + ' <em>kn</em>', "stroming") : "") +
      ((n !== "weinig" && n !== "aflandig") ? meter(k.maat + ' <em>m</em>', "kite") : "");
    $("ctas").innerHTML =
      '<a class="cta" href="' + s.wf + '" target="_blank" rel="noopener">Windfinder</a>' +
      '<button type="button" class="cta ghost" data-open="1">Alle cijfers</button>';
  }

  // ── week ─────────────────────────────────────────────
  function tekenWeek() {
    var toon = st.per === "week";
    $("weeksectie").hidden = !toon;
    if (!toon) return;
    var s = spot(), ds = dagen(s);
    $("week").innerHTML = ds.map(function (d, i) {
      var v = venster(d.blokken), b = v ? top(v.blokken) : top(d.blokken), n = niveau(b);
      return '<button type="button" class="dagkaart' + (i === st.dag ? " aan" : "") +
        '" data-dag="' + i + '" style="--tint:' + tint(n) + '">' +
        '<span class="dk">' + DAGK[d.dag.getDay()] + " " + d.dag.getDate() + '/' + (d.dag.getMonth()+1) + '</span>' +
        '<span class="dv">' + b.lo + "–" + b.hi + ' <em>kn</em></span>' +
        '<span class="dn">' + (v ? uur(v.van.t) + "–" + tot(v.tot) : WOORD[n]) + '</span>' +
        '<span class="dbal"></span></button>';
    }).join("");
  }

  // ── spots ────────────────────────────────────────────
  function tekenSpots() {
    var d0 = huidigeDag();
    $("waarnote").textContent = d0 ? "— " + (st.per === "vandaag" ? "vandaag"
      : DAGK[d0.dag.getDay()] + " " + d0.dag.getDate() + "/" + (d0.dag.getMonth()+1)) : "";
    $("spots").innerHTML = KW.spots.map(function (s) {
      var bewaar = st.spot; st.spot = s.id;
      var ds = dagen(s), d = ds[Math.min(st.dag, ds.length-1)];
      st.spot = bewaar;
      if (!d) return "";
      var v = venster(d.blokken), b = v ? top(v.blokken) : top(d.blokken), n = niveau(b);
      return '<button type="button" class="spot' + (s.id === st.spot ? " aan" : "") +
        '" data-spot="' + s.id + '" style="--tint:' + tint(n) + '" aria-pressed="' + (s.id === st.spot) + '">' +
        kompasSvg(s, b.dir, n === "aflandig" ? "#CE4A1F" : "#17130F") +
        '<span class="sinfo"><span class="snm">' + esc(s.naam) + '</span>' +
        '<span class="svorm">' + esc(s.vorm) + '</span>' +
        '<span class="swaarde">' + b.lo + "–" + b.hi + ' <em>kn</em></span>' +
        '<span class="sstaat">' + (v ? uur(v.van.t) + "–" + tot(v.tot) + " · " + WOORD[n] : WOORD[n]) +
        '</span></span></button>';
    }).join("");
  }

  // ── uur voor uur: chips, klikbaar, ze sturen de strandkaart ──
  function tekenUren() {
    var d = huidigeDag();
    if (!d) return;
    var dr = draai(d.blokken);
    $("uurnote").textContent = dr >= 25 ? "— wind draait " + dr + "\u00b0 over de dag · klik een uur"
                                        : "— richting blijft gelijk · klik een uur";
    $("uren").innerHTML = d.blokken.map(function (b) {
      var n = niveau(b);
      return '<button type="button" class="blok' + (b.t === st.blok ? " nu" : "") +
        '" data-t="' + b.t + '" style="--tint:' + tint(n) + ';--tint-v:' + tintV(n) + '" ' +
        'aria-label="' + uur(b.t) + ", " + b.lo + " tot " + b.hi + " knopen uit " + kompas(b.dir) +
        ", " + WOORD[n] + '" aria-pressed="' + (b.t === st.blok) + '">' +
        '<span class="buur">' + uur(b.t).slice(0,2) + '</span>' +
        '<span class="bkn">' + b.lo + "\u2013" + b.hi + '</span>' +
        (b.vlaagHi ? '<span class="bvl">' + b.vlaagHi + ' vl</span>' : '<span class="bvl">&nbsp;</span>') +
        '<span class="bpijl">' + pijl(b.dir) + '</span>' +
        '<span class="bstroom"><i style="width:' +
          (b.stroom ? Math.min(100, b.stroom.kn / 1.2 * 100).toFixed(0) : 0) + '%"></i></span>' +
      '</button>';
    }).join("");

    $("legenda").innerHTML =
      ["perfect","goed","matig","weinig","aflandig"].map(function (k) {
        return '<span class="lg"><i style="background:' + tint(k) + '"></i>' + WOORD[k] + '</span>';
      }).join("") +
      '<span class="lg">vl = vlagen</span>' +
      '<span class="lg"><i style="background:var(--zacht);opacity:.55"></i>streepje = stroming</span>';
  }

  // ── kite-advies over het bereik ──────────────────────
  function tekenKit() {
    $("quiver").innerHTML = [5,6,7,8,9,10,12,14].map(function (m) {
      return '<button type="button" class="kitepil' + (st.kites.indexOf(m) >= 0 ? " aan" : "") +
        '" data-kite="' + m + '" aria-pressed="' + (st.kites.indexOf(m) >= 0) + '">' + m + ' m</button>';
    }).join("");

    var d = huidigeDag();
    if (!d) { $("advies").innerHTML = ""; return; }
    var v = venster(d.blokken), b = v ? top(v.blokken) : top(d.blokken), n = niveau(b);
    if (n === "weinig" || n === "aflandig") {
      $("advies").innerHTML = '<div class="kadvies" style="--tint:' + tint(n) + ';--tint-v:' + tintV(n) + '">' +
        '<span class="kwan">' + (st.per === "vandaag" ? "vandaag" : "deze dag") + '</span>' +
        '<b>—</b><span>' + (n === "aflandig" ? "aflandig, niet gaan" : "te weinig wind voor een kite") +
        '</span></div>';
      return;
    }
    // drie punten in het bereik: rustig, midden, hardste
    var punten = [["bij " + b.lo + " kn", b.lo], ["bij " + b.mid + " kn", b.mid], ["bij " + b.hi + " kn", b.hi]];
    $("advies").innerHTML = punten.map(function (p) {
      var k = kiesKite(p[1]);
      var kl = k.staat === "precies goed" ? "perfect"
             : (k.staat === "iets overpowered" || k.staat === "iets underpowered") ? "goed" : "matig";
      return '<div class="kadvies" style="--tint:' + tint(kl) + ';--tint-v:' + tintV(kl) + '">' +
        '<span class="kwan">' + p[0] + '</span>' +
        '<b>' + k.maat + ' m</b><span>' + k.staat + '</span></div>';
    }).join("");
  }

  // ── detail ───────────────────────────────────────────
  function open(tISO) {
    var s = spot(), b = null;
    if (tISO) b = reeks(s).filter(function (x) { return x.t === tISO; })[0];
    if (!b) { var d = huidigeDag(), v = d && venster(d.blokken); b = v ? top(v.blokken) : (d && top(d.blokken)); }
    if (!b) return;
    var n = niveau(b), k = kiesKite(b.mid);
    $("sheet-t").textContent = s.naam + " · " + uur(b.t);
    var r = [
      ["wind", b.lo + "–" + b.hi + " kn"],
      ["vlagen", b.vlaagHi ? b.vlaagLo + "–" + b.vlaagHi + " kn" : "—"],
      ["richting", kompas(b.dir) + " · " + b.dir + "°"],
      ["ten opzichte van strand", b.component >= 0
        ? b.component + "% naar het strand" : Math.abs(b.component) + "% naar zee"],
      ["stroming", b.stroom ? b.stroom.kn + " kn naar " + kompas(b.stroom.naar) : "geen bron"],
      ["kite", (n !== "weinig" && n !== "aflandig") ? k.maat + " m · " + k.staat : "—"],
      ["modellen het eens", b.appPct != null ? b.appPct + "%" : "gemeten"],
      ["oordeel", WOORD[n]]
    ];
    if (b.vlagerig) r.push(["let op", "vlagerig"]);
    $("sheet-b").innerHTML = r.map(function (x) {
      return '<div class="rij"><span>' + x[0] + '</span><span>' + x[1] + '</span></div>'; }).join("");
    $("sheet").hidden = false; $("sheet-x").focus();
  }
  function sluit() { $("sheet").hidden = true; }

  function teken() { tekenNu(); tekenHero(); tekenWeek(); tekenSpots(); tekenScene(); tekenUren(); tekenKit(); }

  document.addEventListener("click", function (e) {
    var seg = e.target.closest(".seg button");
    if (seg) {
      seg.parentNode.querySelectorAll("button").forEach(function (b) { b.classList.remove("on"); });
      seg.classList.add("on");
      if (seg.dataset.per) { st.per = seg.dataset.per; st.dag = 0; st.blok = null; }
      if (seg.dataset.board) st.board = seg.dataset.board;
      return teken();
    }
    var kp = e.target.closest("[data-kite]");
    if (kp) {
      var m = +kp.dataset.kite, i = st.kites.indexOf(m);
      if (i >= 0) st.kites.splice(i,1); else st.kites.push(m);
      st.kites.sort(function (a,b) { return a-b; });
      return teken();
    }
    var dk = e.target.closest("[data-dag]");  if (dk) { st.dag = +dk.dataset.dag; st.blok = null; return teken(); }
    var sp = e.target.closest("[data-spot]"); if (sp) { st.spot = sp.dataset.spot; st.blok = null; return teken(); }
    var bl = e.target.closest("[data-t]");    if (bl) { st.blok = bl.dataset.t; return teken(); }
    if (e.target.closest("[data-open]")) return open(st.blok);
    if (e.target.id === "sheet-x" || e.target.id === "sheet") sluit();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !$("sheet").hidden) sluit(); });
  $("kg").addEventListener("input", function (e) {
    var v = parseInt(e.target.value,10);
    if (v >= 40 && v <= 140) { st.kg = v; teken(); } });

  $("ververst").textContent = "ververst " + new Date(KW.gegenereerd).toLocaleString("nl-NL");
  teken();
})();
