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
  p.on("console", m => { if (m.type() === "error") fouten.push(m.text().slice(0, 80)); });
  await p.addInitScript((s) => localStorage.setItem("kiteweer", JSON.stringify(Object.assign({ v:3, mix:"dajk" }, s))), st);
  await p.goto(URL + "?v=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(3500);
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
}
await b.close();
console.log(stuk ? "\nINSTELLINGEN: " + stuk + " PROBLEMEN" : "\nINSTELLINGEN: alles goed");
process.exit(stuk ? 1 : 0);
