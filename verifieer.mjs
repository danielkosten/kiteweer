// Toets elk model en elke mix tegen wat KNMI Hoek van Holland (330) echt mat, afgelopen week.
//   node verifieer.mjs            (pas S/E aan voor een andere week)
// Let op: HvH staat op een pier, meet hoger dan een strand; één week is één week.
const M=[["knmi_harmonie_arome_netherlands","Harmonie","r",0.88],["meteofrance_arome_france_hd","AROME-HD","r",1.16],["icon_d2","ICON-D2","r",1.03],["ukmo_uk_deterministic_2km","UKV","r",0.93],["ecmwf_ifs025","ECMWF","g",1],["gfs_seamless","GFS","g",1],["icon_seamless","ICON","g",1],["meteofrance_seamless","ARPEGE","g",1]];
const S="2026-08-30",E="2026-09-05";
// voorspellingen (Open-Meteo bewaart de run van ~1 dag vooruit) op de Zandmotor
const f=await (await fetch(`https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=52.052&longitude=4.185&start_date=${S}&end_date=${E}&hourly=wind_speed_10m,wind_direction_10m&wind_speed_unit=kn&models=${M.map(m=>m[0]).join(",")}&timezone=Europe/Amsterdam`)).json();
// gemeten: KNMI uurgegevens Hoek van Holland (330), FH = uurgemiddelde wind in 0,1 m/s, UTC
const body=`stns=330&start=${S.replace(/-/g,"")}01&end=${E.replace(/-/g,"")}24&vars=FH:FX:DD&fmt=json`;
const k=await (await fetch("https://www.daggegevens.knmi.nl/klimatologie/uurgegevens",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body})).json();
const meet={}; for(const r of k){ // H = 1..24 UTC, eindigend op dat uur
  const d=new Date(Date.UTC(+r.date.slice(0,4),+r.date.slice(5,7)-1,+r.date.slice(8,10),r.hour-1));
  const loc=new Date(d.getTime()+2*3600e3).toISOString().slice(0,13); meet[loc]=[r.FH*0.1*1.944,r.FX*0.1*1.944,r.DD]; }
const H=f.hourly, rows=[];
H.time.forEach((t,i)=>{ const h=+t.slice(11,13); if(h<7||h>20) return; const m=meet[t.slice(0,13)]; if(!m) return;
  const per={}; for(const [id] of M){ per[id]=H["wind_speed_10m_"+id][i]; } rows.push({t,meet:m[0],per}); });
console.log("uren met meting én voorspelling:",rows.length, "(daglicht 07–20, 30-08 t/m 05-09)");
const wmed=(vals,ws)=>{const p=vals.map((v,i)=>[v,ws[i]]).filter(x=>x[0]!=null).sort((a,b)=>a[0]-b[0]);const tot=p.reduce((a,x)=>a+x[1],0);let acc=0;for(const x of p){acc+=x[1];if(acc>=tot/2)return x[0];}return null;};
const mix=(row,cw,ids)=>{const use=ids.filter(id=>row.per[id]!=null);const som={r:0,g:0};use.forEach(id=>{const m=M.find(x=>x[0]==id);som[m[2]]+=m[3];});
  let c={...cw}; if(!som.r)c={r:0,g:1}; else if(!som.g)c={r:1,g:0};
  return wmed(use.map(id=>row.per[id]),use.map(id=>{const m=M.find(x=>x[0]==id);return m[3]/som[m[2]]*c[m[2]];}));};
const AJK=M.filter(m=>m[1]!="ARPEGE").map(m=>m[0]), FIJN=M.filter(m=>m[2]=="r").map(m=>m[0]), GROF=M.filter(m=>m[2]=="g"&&m[1]!="ARPEGE").map(m=>m[0]);
const stats=(name,fn)=>{let n=0,bias=0,mae=0,hit=0,miss=0,vals=0;for(const r of rows){const v=fn(r);if(v==null)continue;n++;bias+=v-r.meet;mae+=Math.abs(v-r.meet);
  const pk=v>=12,mk=r.meet>=12; if(pk&&mk)hit++; if(!pk&&mk)miss++; if(pk&&!mk)vals++;}
  console.log(name.padEnd(12),"n",String(n).padStart(3),"bias",(bias/n).toFixed(1).padStart(5),"kn  fout",(mae/n).toFixed(1),"kn  kitebaar-uren echt:",rows.filter(r=>r.meet>=12).length,"geraakt",hit,"gemist",miss,"vals alarm",vals);};
for(const [id,naam] of M) stats(naam,r=>r.per[id]);
console.log("--- mixen");
stats("Harmonie",r=>r.per[M[0][0]]); stats("fijn",r=>mix(r,{r:1,g:0},FIJN)); stats("AJK 50/50",r=>mix(r,{r:.5,g:.5},AJK)); stats("DJK 75/25",r=>mix(r,{r:.75,g:.25},AJK)); stats("grof",r=>mix(r,{r:0,g:1},GROF));
console.log("--- Daniels sessies");
for(const t of ["2026-08-30T15:00","2026-08-30T16:00","2026-08-30T17:00","2026-08-31T09:00","2026-08-31T10:00"]){const r=rows.find(x=>x.t==t); if(!r){console.log(t,"geen data");continue;}
  console.log(t,"gemeten HvH",r.meet.toFixed(0),"| Harm",r.per[M[0][0]],"AROME",r.per[M[1][0]],"ICON-D2",r.per[M[2][0]],"UKV",r.per[M[3][0]],"ECMWF",r.per[M[4][0]],"GFS",r.per[M[5][0]],"| AJK",mix(r,{r:.5,g:.5},AJK),"DJK",mix(r,{r:.75,g:.25},AJK));}
