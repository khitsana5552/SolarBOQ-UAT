// UAT v0.5.8 - Non-overlapping system overview layout
(function(){
  const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const F=(v,d=0)=>{const n=Number(v||0);return Number.isFinite(n)?n.toLocaleString(undefined,{maximumFractionDigits:d}):'-';};
  const P=v=>String(v).padStart(2,'0');
  const Q=d=>Math.max(1,Number(d?.project?.inverter_qty||d?.inverter_qty||1));
  let singleDetail58=false;

  const AMP58={
    multi:[{mm2:1,a:14},{mm2:1.5,a:18},{mm2:2.5,a:24},{mm2:4,a:32},{mm2:6,a:40},{mm2:10,a:55},{mm2:16,a:73},{mm2:25,a:96},{mm2:35,a:116}],
    single:[{mm2:25,a:106},{mm2:35,a:131},{mm2:50,a:159},{mm2:70,a:202},{mm2:95,a:245},{mm2:120,a:284},{mm2:150,a:311},{mm2:185,a:349},{mm2:240,a:410},{mm2:300,a:468},{mm2:400,a:531},{mm2:500,a:606}]
  };

  function model(d){const inv=d?.inverter||{},p=d?.project||{};return ((inv.manufacturer||'')+' '+(inv.model||p.inverter_model||'INVERTER')).trim();}
  function prep(d){if(window.SolarBOQMulti47?.allocate){try{window.SolarBOQMulti47.allocate(d);}catch(_e){}}return d;}
  function invCable(d){return window.SolarBOQCable45?.calculate?window.SolarBOQCable45.calculate(d):null;}
  function mdb(d,c){const q=Q(d),raw=window.SolarBOQMDB46?.calculate?window.SolarBOQMDB46.calculate(d):null;if(raw?.status==='PASS')return raw;if(c?.supported)return {required:true,status:'PASS',feederBreakerQty:q,feederBreakerA:Number(c.breakerA||0),mainBreakerA:Number(c.breakerA||0)*q};return raw||{required:true,status:'REVIEW',feederBreakerQty:q,feederBreakerA:0,mainBreakerA:0};}
  function mainFeeder(br){br=Number(br||0);if(!(br>0))return {supported:false};const m=AMP58.multi.find(x=>x.mm2<=35&&x.a>br);if(m)return {supported:true,runs:1,label:`CV Multi-core ${m.mm2} mm²`,totalAmpacity:m.a};const o=AMP58.single.find(x=>x.a>br);if(o)return {supported:true,runs:1,label:`CV Single-core ${o.mm2} mm²`,totalAmpacity:o.a};for(let runs=2;runs<=6;runs++){const h=AMP58.single.find(x=>x.a*runs>br);if(h)return {supported:true,runs,label:`${runs} Runs × CV Single-core ${h.mm2} mm²`,totalAmpacity:h.a*runs};}return {supported:false};}
  function callout(x,y,w,title,line1,line2,accent){return `<g><rect x="${x}" y="${y}" width="${w}" height="82" rx="12" fill="#fff" stroke="#bed8ee" stroke-width="1.5"/><rect x="${x}" y="${y}" width="7" height="82" rx="4" fill="${accent}"/><text x="${x+20}" y="${y+22}" class="ct58">${E(title)}</text><text x="${x+20}" y="${y+49}" class="cm58">${E(line1)}</text><text x="${x+20}" y="${y+69}" class="cs58">${E(line2||'')}</text></g>`;}

  function overview58(d){
    prep(d);
    const q=Q(d),p=d?.project||{},inv=d?.inverter||{},c=invCable(d),md=mdb(d,c),mf=mainFeeder(md?.mainBreakerA),mod=model(d);d.mdb_main_feeder=mf;
    const W=Math.max(1680,420*q+260),H=980,cx=W/2;
    const mainW=560,mainH=96,mainX=cx-mainW/2,mainY=76;
    const mainCallW=500,mainCallX=cx+mainW/2+55,mainCallY=84;
    const mdbW=820,mdbH=158,mdbX=cx-mdbW/2,mdbY=265;
    const junctionY=500,busY=650;
    const invCallW=520,invCallX=cx+80,invCallY=520;
    const invGap=42,invW=Math.min(380,(W-160-(q-1)*invGap)/q),invH=188,invY=735;
    const firstX=(W-(q*invW+(q-1)*invGap))/2,firstCx=firstX+invW/2,lastCx=firstX+(q-1)*(invW+invGap)+invW/2;

    let s=`<svg id="stringSvg" class="engineering-svg sld58" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><defs><marker id="arr58" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#176fc1"/></marker></defs><style>
      text{font-family:Segoe UI,Arial,sans-serif}.title58{fill:#0a3768;font-size:32px;font-weight:900}.sub58{fill:#71879a;font-size:15px}.boxT58{fill:#0c4078;font-size:26px;font-weight:900}.boxS58{fill:#6a8093;font-size:14px}.mainA58{fill:#0876d3;font-size:26px;font-weight:900}.minorA58{fill:#496b86;font-size:15px;font-weight:800}.invT58{fill:#0c4078;font-size:23px;font-weight:900}.invM58{fill:#385f80;font-size:14px;font-weight:750}.invD58{fill:#667f94;font-size:14px}.invC58{fill:#0876d3;font-size:14px;font-weight:900}.hint58{fill:#0f78d5;font-size:14px;font-weight:850}.wire58{stroke:#176fc1;stroke-width:3.8;fill:none;stroke-linecap:round;stroke-linejoin:round}.soft58{stroke:#86b7de;stroke-width:2;fill:none}.node58{fill:#fff;stroke:#176fc1;stroke-width:3}.ct58{fill:#6c8192;font-size:13px;font-weight:850;letter-spacing:.7px}.cm58{fill:#0b4d91;font-size:20px;font-weight:900}.cs58{fill:#58738a;font-size:13px;font-weight:750}.branch58{fill:#eef7ff;stroke:#c7e0f6}.branchT58{fill:#436b8d;font-size:12px;font-weight:850}
    </style><rect width="${W}" height="${H}" fill="#f8fbff"/><text x="42" y="42" class="title58">Part 1 · System Overview</text><text x="42" y="68" class="sub58">${E(p.name||'Solar Project')} · MDB / AC cable / inverter overview</text>
    <rect x="${mainX}" y="${mainY}" width="${mainW}" height="${mainH}" rx="17" fill="#fff" stroke="#89b9e6" stroke-width="2"/><text x="${cx}" y="${mainY+40}" text-anchor="middle" class="boxT58">MDB MAIN (FACTORY)</text><text x="${cx}" y="${mainY+69}" text-anchor="middle" class="boxS58">Existing Factory Main Distribution Board / PCC</text>
    <path d="M${cx} ${mainY+mainH} V${mdbY}" class="wire58" marker-end="url(#arr58)"/>
    <rect x="${mdbX}" y="${mdbY}" width="${mdbW}" height="${mdbH}" rx="17" fill="#fff" stroke="#2aa56d" stroke-width="2.2"/><text x="${mdbX+34}" y="${mdbY+45}" class="boxT58">MDB SOLAR</text><text x="${mdbX+34}" y="${mdbY+76}" class="boxS58">MA Isolation / AC Collection</text>`;
    if(md?.status==='PASS')s+=`<text x="${mdbX+430}" y="${mdbY+58}" class="mainA58">MAIN MCCB ${F(md.mainBreakerA)} A</text><text x="${mdbX+430}" y="${mdbY+94}" class="minorA58">INCOMERS: ${F(md.feederBreakerQty)} × MCCB ${F(md.feederBreakerA)} A</text>`;

    const ml1=mf?.supported?mf.label:'CABLE SIZE · REVIEW',ml2=mf?.supported?`Ampacity ${F(mf.totalAmpacity)} A · Main MCCB ${F(md.mainBreakerA)} A`:'';
    s+=`<path d="M${cx+8} ${mainY+mainH+24} H${mainCallX-14}" class="soft58"/>${callout(mainCallX,mainCallY,mainCallW,'MDB SOLAR → MDB MAIN',ml1,ml2,'#2aa56d')}`;

    s+=`<path d="M${cx} ${mdbY+mdbH} V${junctionY}" class="wire58"/><circle cx="${cx}" cy="${junctionY}" r="7" class="node58"/><path d="M${cx} ${junctionY} V${busY}" class="wire58"/><path d="M${firstCx} ${busY} H${lastCx}" class="wire58"/>`;
    const il1=c?.supported?String(c.cableLabel||'AC Cable'):'CABLE SIZE · REVIEW',il2=c?.supported?`MCCB ${F(c.breakerA)} A each · Ampacity ${F(c.cableAmpacityA)} A`:'';
    s+=`<path d="M${cx+8} ${junctionY+18} H${invCallX-14}" class="soft58"/>${callout(invCallX,invCallY,invCallW,'MDB SOLAR → INVERTERS',il1,il2,'#176fc1')}`;

    for(let i=1;i<=q;i++){
      const x=firstX+(i-1)*(invW+invGap),icx=x+invW/2,ss=(d?.strings||[]).filter(st=>Number(st.inverter_no||1)===i).sort((a,b)=>Number(a.string_no)-Number(b.string_no));
      s+=`<path d="M${icx} ${busY} V${invY}" class="wire58" marker-end="url(#arr58)"/><rect x="${icx-50}" y="${busY+18}" width="100" height="28" rx="8" class="branch58"/><text x="${icx}" y="${busY+38}" text-anchor="middle" class="branchT58">FEEDER ${P(i)}</text><g class="inv-card58 inv-card50" data-inverter-no="${i}" style="cursor:pointer;pointer-events:all" role="button" tabindex="0" onclick="window.SolarBOQOverview58&&window.SolarBOQOverview58.openInverter(${i})"><rect x="${x}" y="${invY}" width="${invW}" height="${invH}" rx="16" fill="#fff" stroke="#86b8e7" stroke-width="2"/><circle cx="${x+32}" cy="${invY+32}" r="19" fill="#1976d2"/><text x="${x+32}" y="${invY+39}" text-anchor="middle" fill="#fff" font-size="15" font-weight="800">${i}</text><text x="${x+64}" y="${invY+40}" class="invT58">INV-${P(i)}</text><text x="${x+27}" y="${invY+79}" class="invM58">${E(mod)}</text><text x="${x+27}" y="${invY+109}" class="invD58">${ss.length} Strings · ${F(inv.num_mppt||d?.num_mppt)} MPPT</text>${c?.supported?`<text x="${x+27}" y="${invY+141}" class="invC58">MCCB ${F(c.breakerA)} A · ${E(c.cableLabel)}</text>`:''}<text x="${x+27}" y="${invY+170}" class="hint58">Open String Arrangement →</text></g>`;
    }
    return s+'</svg>';
  }

  const prev=typeof diagramSvg==='function'?diagramSvg:null;
  if(prev){diagramSvg=function(d){prep(d);const q=Q(d);if(q===1){if(singleDetail58)return prev(d);return overview58(d);}const sel=window.SolarBOQParts50?.getSelected?Number(window.SolarBOQParts50.getSelected()||0):0;return sel===0?overview58(d):prev(d);};}
  function rr(){if(typeof renderDesign==='function')renderDesign();}
  function open(n){const d=(typeof state!=='undefined'&&state?.design)?state.design:null;if(d&&Q(d)>1&&window.SolarBOQParts50?.openInverter){window.SolarBOQParts50.openInverter(n);return;}singleDetail58=true;rr();}
  function overview(){const d=(typeof state!=='undefined'&&state?.design)?state.design:null;if(d&&Q(d)>1&&window.SolarBOQParts50?.overview){window.SolarBOQParts50.overview();return;}singleDetail58=false;rr();}
  window.SolarBOQOverview58={overviewSvg:overview58,openInverter:open,overview};
})();
