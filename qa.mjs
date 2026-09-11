import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:8899/';
const b = await chromium.launch();
let stuk = 0;
for (const [w,h,naam] of [[390,844,'mobiel'],[1200,1900,'breed']]) {
  const p = await b.newPage({ viewport:{width:w,height:h} });
  const errs=[]; p.on('pageerror',e=>errs.push('JS: '+e.message.slice(0,140)));
  p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,140))});
  p.on('requestfailed',r=>{if(!/favicon/.test(r.url())) errs.push('request: '+r.url().slice(0,70));});
  await p.goto(url,{waitUntil:'networkidle',timeout:60000}); await p.waitForTimeout(4000);

  // 1. lekt er ergens ruwe code of undefined de pagina in?
  const tekst = await p.evaluate(()=>document.body.innerText);
  const lek = [/function\s*\(/, /\[object/, /undefined/, /\bNaN\b/, /=>/, /innerHTML/].filter(r=>r.test(tekst));
  // 2. schuift de pagina zijwaarts?
  const breed = await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);
  // 3. steekt er iets buiten het scherm?
  const buiten = await p.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>{
    const r=e.getBoundingClientRect(); return r.width>0 && (r.right>innerWidth+2||r.left<-2) && !e.closest('.scroll,.weekstrip,.spotlijst,.dagenrij,.leaflet-container');
  }).slice(0,4).map(e=>e.tagName+'.'+(e.className||'').toString().slice(0,25)));
  // 3b. staan de vaste onderdelen er op DEZE breedte ook echt, en zijn ze zichtbaar?
  //     Zonder deze controle kan een regel in een media-query iets stil laten verdwijnen.
  const mist = await p.evaluate(()=>['#weekmini','#weekstrip','.uurtabel','#legenda','.weekmini .wm']
    .filter(s=>{const e=document.querySelector(s); if(!e) return true; const r=e.getBoundingClientRect(); return r.width<2||r.height<2;}));
  console.log(`\n== ${naam} ==`);
  console.log('  onderdelen :', mist.length?'MIST '+mist.join(', '):'alle aanwezig');
  console.log('  fouten     :', errs.length?errs.join(' | '):'geen');
  console.log('  codelek    :', lek.length?lek.map(String).join(' '):'geen');
  console.log('  zijwaarts  :', breed?'JA (fout)':'nee');
  console.log('  buiten beeld:', buiten.length?buiten.join(', '):'geen');
  if (errs.length||lek.length||breed||buiten.length||mist.length) stuk++;

  // 4. elk uitlegvenster openen en op lek controleren
  const knoppen = await p.$$eval('.uurtabel th button.info', els=>els.map(e=>e.dataset.info));
  for (const naam of knoppen) {
    const sel = `.uurtabel th [data-info="${naam}"]`;
    if (!await p.$(sel)) { console.log('  venster', sel, ': knop ontbreekt'); continue; }
    await p.click(sel); await p.waitForTimeout(350);
    const s = await p.evaluate(()=>({t:document.getElementById('sheet-t').textContent, b:document.getElementById('sheet-b').innerText, open:!document.getElementById('sheet').hidden, past:(()=>{const r=document.querySelector('.sheet-in').getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1;})()}));
    const slecht = /function\s*\(|undefined|\[object|NaN/.test(s.b);
    console.log('  venster', naam.padEnd(9), ':', s.open?'open':'DICHT', '| past:', s.past, '| lek:', slecht?'JA':'nee', '|', s.t);
    if (!s.open||!s.past||slecht) stuk++;
    await p.click('#sheet-x'); await p.waitForTimeout(250);
  }
  await p.screenshot({path:'qa-'+naam+'.png', fullPage:true});
  await p.close();
}
await b.close();
console.log(stuk? '\nQA: '+stuk+' PROBLEMEN' : '\nQA: alles goed');
process.exit(stuk?1:0);
