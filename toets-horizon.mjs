// Hoe goed is elk grof model op 1..7 dagen vooruit? Open-Meteo bewaart per dag de eerdere runs
// (previous-runs API); vergeleken met KNMI Hoek van Holland (330), daglicht 07–20, afgelopen 60 dagen.
//   node toets-horizon.mjs
// HvH staat op een pier en meet hoger dan het strand: alle modellen zitten daardoor te laag, de
// onderlinge volgorde blijft bruikbaar. Fout = gemiddelde afwijking in kn; raak/mis/vals = uren ≥14 kn.
const M=["ecmwf_ifs","ecmwf_ifs025","gfs_seamless","icon_seamless","meteofrance_seamless","ukmo_global_deterministic_10km","gem_global","jma_seamless"];
const D=60, L=[1,2,3,4,5,6,7];
const p=(await (await fetch(`https://previous-runs-api.open-meteo.com/v1/forecast?latitude=52.052&longitude=4.185&hourly=${L.map(l=>"wind_speed_10m_previous_day"+l).join(",")}&wind_speed_unit=kn&timezone=Europe/Amsterdam&past_days=${D}&forecast_days=1&models=${M.join(",")}`)).json()).hourly;
const s=new Date(Date.now()-D*864e5).toISOString().slice(0,10).replace(/-/g,""), e=new Date().toISOString().slice(0,10).replace(/-/g,"");
const k=await (await fetch("https://www.daggegevens.knmi.nl/klimatologie/uurgegevens",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:`stns=330&start=${s}01&end=${e}24&vars=FH&fmt=json`})).json();
const meet={}; for(const r of k){ if(r.FH==null) continue; const d=new Date(Date.UTC(+r.date.slice(0,4),+r.date.slice(5,7)-1,+r.date.slice(8,10),r.hour-1)+2*3600e3); meet[d.toISOString().slice(0,13)]=r.FH*0.1*1.944; }
console.log("model".padEnd(32)+L.map(l=>`  dag ${l}: fout(bias) raak/mis/vals`).join(""));
for(const m of M){ let row=m.padEnd(32);
  for(const l of L){ const v=p[`wind_speed_10m_previous_day${l}_${m}`]; let n=0,mae=0,b=0,h=0,mi=0,f=0;
    if(v) p.time.forEach((t,i)=>{ const x=v[i], o=meet[t.slice(0,13)], u=+t.slice(11,13); if(x==null||o==null||u<7||u>20) return; n++; mae+=Math.abs(x-o); b+=x-o; if(o>=14&&x>=14)h++; if(o>=14&&x<14)mi++; if(o<14&&x>=14)f++; });
    row+=n?`  ${(mae/n).toFixed(1)}(${(b/n).toFixed(1).padStart(5)}) ${String(h).padStart(3)}/${String(mi).padStart(3)}/${String(f).padStart(3)}`:"  -".padEnd(30); }
  console.log(row); }
