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
  const mist = await p.evaluate(()=>['#weekmini','#weekstrip','.uurtabel','.legenda-knop','.weekmini .wm','#kg','#groot','#board']
    .filter(s=>{const e=document.querySelector(s); if(!e) return true; const r=e.getBoundingClientRect(); return r.width<2||r.height<2;}));
  console.log(`\n== ${naam} ==`);
  // 3c. stopt er ergens vet midden in een tijd of een getal? Zo stond er "stroom draait rond 09"
  //     vet en daarna ":00" gewoon, omdat de dubbele punt van een tijd als scheiding gold.
  const kapotVet = await p.evaluate(()=>[...document.querySelectorAll('b,strong')]
    .filter(e=>{const na=(e.nextSibling&&e.nextSibling.textContent)||''; 
      return /\d$/.test(e.textContent.trim()) && /^[:.,]\d/.test(na);})
    .slice(0,3).map(e=>e.textContent.trim().slice(-24)));
  console.log('  onderdelen :', mist.length?'MIST '+mist.join(', '):'alle aanwezig');
  console.log('  vet kapot  :', kapotVet.length?kapotVet.join(' | '):'nee');
  // 3d. steekt een invoerveld of keuzelijst buiten de pil waar hij in zit? Zo tekende Safari op de
  //     telefoon een zwarte doos om de kitekiezer heen, buiten zijn eigen rand (12-09).
  const uitPil = await p.evaluate(()=>{
    const uit=[];
    for (const el of document.querySelectorAll('.keuze select, .keuze input')) {
      const pil=el.closest('.keuze'); if(!pil) continue;
      const a=pil.getBoundingClientRect(), c=el.getBoundingClientRect();
      const over=Math.max(a.left-c.left, c.right-a.right, a.top-c.top, c.bottom-a.bottom);
      if (over>1) uit.push((el.id||el.tagName)+' steekt '+Math.round(over)+'px uit');
    }
    return uit;
  });
  console.log('  uit de pil :', uitPil.length?uitPil.join(' | '):'nee');
  // 3e. staan de cellen binnen een rij op dezelfde hoogte, EN mag er uberhaupt iets afbreken?
  //     "0,8 m" brak op Daniels iPhone naar twee regels terwijl "0,7 m" ernaast op een regel paste.
  //     In deze testbrowser gebeurt dat op geen enkele breedte: Safari meet letters net iets breder.
  //     Daarom kijken we ook naar de REGEL zelf, niet alleen naar het plaatje: een cel in de uurtabel
  //     hoort nooit te mogen afbreken, want dan lopen de rijen scheef (12-09).
  const scheveRij = await p.evaluate(()=>{
    const uit=[];
    for (const tr of document.querySelectorAll('.uurtabel tr')) {
      const h=[...tr.querySelectorAll('td')].map(td=>Math.round(td.getBoundingClientRect().height)).filter(x=>x>0);
      if (h.length<2) continue;
      const lo=Math.min(...h), hi=Math.max(...h);
      if (hi-lo>2) uit.push((tr.querySelector('th')||{}).innerText?.trim().split('\n')[0]+': '+lo+' tot '+hi+' px');
    }
    for (const td of document.querySelectorAll('.uurtabel td')) {
      if (getComputedStyle(td).whiteSpace.indexOf('nowrap')<0) { uit.push('een cel in de uurtabel mag afbreken'); break; }
    }
    return uit.slice(0,4);
  });
  console.log('  rij scheef :', scheveRij.length?scheveRij.join(' | '):'nee');
  console.log('  fouten     :', errs.length?errs.join(' | '):'geen');
  console.log('  codelek    :', lek.length?lek.map(String).join(' '):'geen');
  console.log('  zijwaarts  :', breed?'JA (fout)':'nee');
  console.log('  buiten beeld:', buiten.length?buiten.join(', '):'geen');
  if (errs.length||lek.length||breed||buiten.length||mist.length||kapotVet.length||uitPil.length||scheveRij.length) stuk++;

  // 4. elk uitlegvenster openen en op lek controleren
  //    Loopt over ELKE i-knop op de pagina, niet alleen die in de tabel: zo valt een nieuwe knop
  //    nooit buiten de controle. Stond eerst vast op '.uurtabel th', waardoor de legenda- en
  //    cijferknop ongetest bleven (12-09).
  const knoppen = await p.$$eval('button.info[data-info]', els=>[...new Set(els.map(e=>e.dataset.info))]);
  for (const naam of knoppen) {
    const sel = `[data-info="${naam}"]`;
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
