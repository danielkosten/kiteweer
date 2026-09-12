// Toets: staat elk geijkt getal nog maar op EEN plek in app.js?
//   node dubbel.mjs
// Waarom dit bestaat: vier keer op rij ging het op dezelfde manier mis. Dezelfde regel stond op
// twee plekken met twee getallen, en dan zegt de pagina op de ene plek iets anders dan op de
// andere. Vlagerig stond vijf keer (1,5 / 1,6 / 1,8 / +10 kn / +6 kn), de factor 2,2 twee keer,
// de woorden bij een druk drie keer, en de grens voor stroom mee twee keer. Geen van die vier was
// in de browser te zien: de pagina zag er prima uit en sprak zichzelf tegen.
// Deze toets kijkt niet of de som klopt, maar of er maar EEN som is.
import { readFile } from "node:fs/promises";

const ruw = await readFile("app.js", "utf8");
// Commentaar en tekst tussen aanhalingstekens tellen niet mee: daar staan getallen in uitleg, en
// die mogen best vaker voorkomen. Dit loopt teken voor teken door het bestand, want met een enkele
// zoekopdracht ging het mis: een aanhalingsteken binnen /[&<>"]/ liet de helft van het bestand
// verdwijnen en dan meldde de toets vrolijk dat alles goed was.
function alleenCode(src) {
  let uit = "", i = 0, n = src.length;
  const vorigeEcht = () => { for (let k = uit.length - 1; k >= 0; k--) if (!/\s/.test(uit[k])) return uit[k]; return ""; };
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === "/" && d === "*") { const e = src.indexOf("*/", i + 2); i = e < 0 ? n : e + 2; uit += " "; continue; }
    if (c === "/" && d === "/") { const e = src.indexOf("\n", i); i = e < 0 ? n : e; uit += " "; continue; }
    if (c === '"' || c === "'" || c === "`") {
      i++; while (i < n && src[i] !== c) i += src[i] === "\\" ? 2 : 1;
      i++; uit += '""'; continue;
    }
    // Een / is een deling of het begin van een zoekpatroon; wat ervoor staat beslist welke.
    if (c === "/" && !"})]".includes(vorigeEcht()) && !/[\w$]/.test(vorigeEcht())) {
      i++; let inHaak = false;
      while (i < n) { const x = src[i];
        if (x === "\\") { i += 2; continue; }
        if (x === "[") inHaak = true; else if (x === "]") inHaak = false;
        else if (x === "/" && !inHaak) break;
        else if (x === "\n") break;
        i++; }
      i++; uit += "//"; continue;
    }
    uit += c; i++;
  }
  return uit;
}
const code = alleenCode(ruw);

// Elk getal hieronder hoort precies een keer in de code te staan: op de regel waar het zijn naam
// krijgt. Staat het vaker, dan is er ergens een tweede kopie ontstaan.
const GEIJKT = [
  ["2.2",  "KITEFACTOR, de vuistregel voor de kitemaat", "pijl"],
  ["1.8",  "VLAGERIG, wanneer vlagen straf kosten"],
  ["1.35", "STABIEL, wanneer wind gelijkmatig heet"],
  ["1.6",  "MAATJE_KLEINER, wanneer je een maat kleiner pakt"],
  ["0.97", "DRUK_GOED, de ondergrens van de hele pagina"],
  ["1.32", "DRUK_PERFECT, de grens tussen goed en perfect"],
  // 1,5 staat er expres NIET bij. Dat getal betekent op zes plekken iets anders (meters kleiner,
  // meter golfhoogte, punten straf, knopen afwijking, de dikte van een pijl) en dan meldt de toets
  // alleen maar ruis. KLEINER.directional loopt geen gevaar: overal wordt de naam gebruikt.
];

let stuk = 0;
console.log("staat elk geijkt getal nog maar op een plek in app.js?");
for (const [getal, wat, tekenwerk] of GEIJKT) {
  // Tekenwerk (de pijl) gebruikt toevallig dezelfde getallen voor vormen; dat telt niet mee.
  const bron = tekenwerk ? code.replace(/function arrow\([\s\S]*?\n    }/, " ") : code;
  // Op zichzelf staand getal, niet als deel van een langer getal.
  const treffers = bron.match(new RegExp("(?<![\\d.])" + getal.replace(".", "\\.") + "(?![\\d])", "g")) || [];
  const ok = treffers.length === 1;
  if (!ok) stuk++;
  console.log("  " + (ok ? "goed" : "FOUT") + "  " + (getal + "  " + wat).padEnd(62) + treffers.length + "x");
}

// En andersom: een naam die nergens gebruikt wordt is een regel die stilletjes dood is.
const NAMEN = ["KITEFACTOR", "VLAGERIG", "STABIEL", "MAATJE_KLEINER", "DRUK_GOED", "DRUK_PERFECT",
  "STRAF_VLAGERIG", "BONUS_STABIEL", "KLEINER", "CURVE", "DRUK_WOORDEN", "VEEL", "TEVEEL"];
for (const naam of NAMEN) {
  const n = (code.match(new RegExp("\\b" + naam + "\\b", "g")) || []).length;
  const ok = n >= 2;                                   // een keer de naam geven, minstens een keer gebruiken
  if (!ok) stuk++;
  console.log("  " + (ok ? "goed" : "FOUT") + "  " + (naam + " wordt gebruikt").padEnd(62) + n + "x");
}

// De stroomsterkte mag alleen in stroomPost tot een oordeel leiden. Hierop ging het mis: het cijfer
// en het uitlegvenster hadden elk hun eigen grenzen, en dan zegt de bullet "stroom dwars" terwijl de
// opbouw eronder "stroom mee" zegt. Het getal zelf tonen mag overal; er een grens op leggen niet.
// kenteringen() valt hier expres buiten: dat beantwoordt een andere vraag, namelijk wanneer de
// stroom draait, niet wat hij kost. Die grens heet KENTERING en staat op zijn eigen plek.
const zonderPost = ruw
  .replace(/function stroomPost\([\s\S]*?\n  }/, " ")
  .replace(/function kenteringen\([\s\S]*?\n  }/, " ");
const losseOordelen = zonderPost.split("\n")
  .map((r, i) => [i + 1, r])
  .filter(([, r]) => /\bstroomC\s*\(/.test(r) && /[<>]=?\s*-?[\d.]/.test(r))
  .map(([i, r]) => i + ": " + r.trim().slice(0, 60));
const stroomOk = losseOordelen.length === 0;
if (!stroomOk) stuk++;
console.log("\n" + (stroomOk ? "goed" : "FOUT") + "  de stroomsterkte wordt alleen in stroomPost beoordeeld"
  + (stroomOk ? "" : ":\n    " + losseOordelen.join("\n    ")));

console.log(stuk ? "\nDUBBELE GETALLEN: " + stuk + " PROBLEMEN" : "\nDUBBELE GETALLEN: geen");
process.exit(stuk ? 1 : 0);
