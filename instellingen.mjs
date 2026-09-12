// Toets: doet de pagina het ook voor iemand anders dan Daniel?
//   node instellingen.mjs [url]
// Waarom dit bestaat: alles is geijkt op 85 kg met een 13 m twintip op Kijkduin, en dat is de enige
// combinatie die ooit met het oog bekeken is. Een lichte rijder op een kleine kite, een directional,
// of oude rommel in de browseropslag kwamen nergens voorbij. Juist daar ging het eerder mis: een
// boardnaam die de pagina niet kende maakte elke som stil leeg, zonder foutmelding.
// Deze toets zet zes verschillende instellingen in de browser en kijkt of de pagina heel blijft.
import { chromium } from "playwright";

const URL = process.argv[2] || "https://danielkosten.github.io/kiteweer/";
const COMBIS = [
  ["Daniel",            { board:"twintip",     kg:85,  groot:13, spot:"kijkduin" }],
  ["lichte rijder",     { board:"twintip",     kg:55,  groot:9,  spot:"zandmotor" }],
  ["zware rijder",      { board:"twintip",     kg:110, groot:15, spot:"noordpier" }],
  ["directional",       { board:"directional", kg:85,  groot:8,  spot:"wassenaar" }],
  ["kleinste kite",     { board:"twintip",     kg:85,  groot:4,  spot:"scheveningen" }],
  // Rommel uit de browseropslag: een board dat niet bestaat, een onmogelijk gewicht, een spot die
  // weg is. Alles hoort terug te vallen op iets geldigs in plaats van lege vakjes te tonen.
  ["rommel in de opslag", { board:"foilboard", kg:999, groot:99, spot:"bestaatniet" }],
];

const b = await chromium.launch();
let stuk = 0;
console.log("de pagina met zes verschillende instellingen: " + URL);
for (const [naam, st] of COMBIS) {
  const p = await b.newPage({ viewport: { width: 402, height: 1000 } });
  const fouten = [];
  p.on("pageerror", e => fouten.push(String(e).slice(0, 80)));
  /* Alleen echte fouten in de code tellen. Zes keer achter elkaar dezelfde spots bij Open-Meteo
     ophalen loopt tegen hun limiet aan, en dan schrijft de browser "Failed to load resource" in de
     console. Dat is geen fout in de pagina: die valt dan juist netjes terug op uur.js, en dat is
     precies het gedrag dat deze toets hoort goed te keuren. Deze poort stond daardoor een keer op
     3 PROBLEMEN en twee minuten later op alles goed (12-09), en een poort die knippert leer je
     negeren. */
  p.on("console", m => { const t = m.text();
    if (m.type() === "error" && !/Failed to load resource|net::ERR|429|50\d \(/.test(t)) fouten.push(t.slice(0, 80)); });
  await p.addInitScript((s) => localStorage.setItem("kiteweer", JSON.stringify(Object.assign({ v:3, mix:"dajk" }, s))), st);
  await p.goto(URL + "?v=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 60000 });
  /* Wachten op wat er moet staan, niet op de klok: 3,5 seconde is genoeg op een rustige laptop en
     te kort vlak na een andere browsertoets. */
  await p.waitForFunction(() => {
    const k = document.querySelector(".dagkop b");
    return k && k.textContent.trim().length > 3 && document.querySelectorAll(".dagkaart").length > 0;
  }, null, { timeout: 45000 }).catch(() => {});
  const r = await p.evaluate(() => {
    const t = document.body.innerText;
    return {
      rommel: /NaN|undefined|\[object/.test(t),
      leeg: t.length < 400,
      kg: ((document.getElementById("kg") || {}).value || "") + " kg",
      kite: (document.getElementById("groot") || {}).value || "",
      kop: (document.getElementById("verdict") || {}).textContent || "",
      sessies: document.querySelectorAll(".venster").length,
    };
  });
  const ok = !r.rommel && !r.leeg && !fouten.length;
  if (!ok) stuk++;
  console.log("  " + (ok ? "goed" : "FOUT") + "  " + naam.padEnd(20) + r.kg.padEnd(8) + (r.kite + " m").padEnd(7) +
    (r.sessies + " sessies").padEnd(12) + r.kop.slice(0, 26).padEnd(28) +
    (fouten.length ? "FOUT IN DE BROWSER: " + fouten[0] : r.rommel ? "NaN of undefined op de pagina" : r.leeg ? "pagina bleef leeg" : ""));
  await p.close();
  await new Promise(r => setTimeout(r, 800));   // even lucht laten voor de volgende zes-op-een-rij
}
await b.close();
console.log(stuk ? "\nINSTELLINGEN: " + stuk + " PROBLEMEN" : "\nINSTELLINGEN: alles goed");
process.exit(stuk ? 1 : 0);
