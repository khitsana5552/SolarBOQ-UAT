// UAT v0.5.7 - Larger CAD-style cable labels + calculated MDB SOLAR -> MDB MAIN feeder
(function(){
  const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const F=(v,d=0)=>{const n=Number(v||0);return Number.isFinite(n)?n.toLocaleString(undefined,{maximumFractionDigits:d}):'-';};
  const P=v=>String(v).padStart(2,'0');
  const Q=d=>Math.max(1,Number(d?.project?.inverter_qty||d?.inverter_qty||1));
  let singleDetail57=false;

  const AMP57={
    multi:[{mm2:1,a:14},{mm2:1.5,a:18},{mm2:2.5,a:24},{mm2:4,a:32},{mm2:6,a:40},{mm2:10,a:55},{mm2:16,a:73},{mm2:25,a:96},{mm2:35,a:116}],
    single:[{mm2:25,a:106},{mm2:35,a:131},{mm2:50,a:159},{mm2:70,a:202},{mm2:95,a:245},{mm2:120,a:284},{mm2:150,a:311},{mm2:185,a:349},{mm2:240,a:410},{mm2:300,a:468},{mm2:400,a:531},{mm2:500,a:606}]
  };

  function model57(d){const inv=d?.inverter||{},p=d?.project||{};return ((inv.manufacturer||'')+' '+(inv.model||p.inverter_model||'INVERTER')).trim();}
  function prep57(d){if(window.SolarBOQMulti47?.allocate){try{window.SolarBOQMulti47.allocate(d);}catch(_e){}}return d;}
  function invCable57(d){return window.SolarBOQCable45?.calculate?window.SolarBOQCable45.calculate(d):null;}
  function mdb57(d,c){
    const q=Q(d),raw=window.SolarBOQMDB46?.calculate?window.SolarBOQMDB46.calculate(d):null;
    if(raw?.status==='PASS')return raw;
    if(c?.supported)return {required:true,status:'PASS',feederBreakerQty:q,feederBreakerA:Number(c.breakerA||0),mainBreakerA:Number(c.breakerA||0)*q};
    return raw||{required:true,status:'REVIEW',feederBreakerQty:q,feederBreakerA:0,mainBreakerA:0};
  }

  // Company rule already confirmed: breaker must be lower than cable ampacity; multi-core is capped at 35 mm².
  // For MDB main feeders above one cable's ampacity, use parallel identical single-core runs and choose
  // the fewest runs first, then the smallest conductor size that gives total ampacity > breaker.
  function mainFeeder57(mainBreakerA){
    const br=Number(mainBreakerA||0);
    if(!(br>0))return {supported:false,status:'REVIEW'};
    const multi=AMP57.multi.find(x=>x.mm2<=35&&x.a>br);
    if(multi)return {supported:true,status:'PASS',runs:1,type:'Multi-core',mm2:multi.mm2,ampacityEach:multi.a,totalAmpacity:multi.a,label:`CV Multi-core ${multi.mm2} mm²`};
    const one=AMP57.single.find(x=>x.a>br);
    if(one)return {supported:true,status:'PASS',runs:1,type:'Single-core',mm2:one.mm2,ampacityEach:one.a,totalAmpacity:one.a,label:`CV Single-core ${one.mm2} mm²`};
    for(let runs=2;runs<=6;runs++){
      const hit=AMP57.single.find(x=>x.a*runs>br);
      if(hit)return {supported:true,status:'PASS',runs,type:'Single-core',mm2:hit.mm2,ampacityEach:hit.a,totalAmpacity:hit.a*runs,label:`${runs} Runs × CV Single-core ${hit.mm2} mm²`};
    }
    return {supported:false,status:'FAIL'};
  }

  function callout57(x,y,w,title,line1,line2,accent='#1679d2'){
    return `<g class="cable-callout57">
      <rect x="${x}" y="${y}" width="${w}" height="74" rx="12" fill="#ffffff" stroke="#b9d7ef" stroke-width="1.6"/>
      <rect x="${x}" y="${y}" width="7" height="74" rx="3.5" fill="${accent}"/>
      <text x="${x+20}" y="${y+22}" class="callTitle57">${E(title)}</text>
      <text x="${x+20}" y="${y+46}" class="callMain57">${E(line1)}</text>
      ${line2?`<text x="${x+20}" y="${y+65}" class="callMeta57">${E(line2)}</text>`:''}
    </g>`;
  }

  function overview57(d){
    prep57(d);
    const q=Q(d),p=d?.project||{},inv=d?.inverter||{},c=invCable57(d),mdb=mdb57(d,c),model=model57(d);
    const mainFeed=mainFeeder57(mdb?.mainBreakerA);
    d.mdb_main_feeder=mainFeed;
    const W=Math.max(1560,390*q+230),H=840,cx=W/2;
    const mainW=560,mainH=96,mainX=cx-mainW/2,mainY=70;
    const mdbW=800,mdbH=150,mdbX=cx-mdbW/2,mdbY=250;
    const invGap=38,invW=Math.min(370,(W-140-(q-1)*invGap)/q),invH=180,invY=590;
    const firstX=(W-(q*invW+(q-1)*invGap))/2;
    const busY=510,firstCx=firstX+invW/2,lastCx=firstX+(q-1)*(invW+invGap)+invW/2;

    let s=`<svg id="stringSvg" class="engineering-svg sld57" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
      <defs><marker id="arr57" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#176fc1"/></marker></defs>
      <style>
        text{font-family:Segoe UI,Arial,sans-serif}.title57{fill:#0a3768;font-size:31px;font-weight:850}.sub57{fill:#71879a;font-size:15px}.boxT57{fill:#0c4078;font-size:25px;font-weight:900}.boxS57{fill:#6a8093;font-size:14px}.mainA57{fill:#0876d3;font-size:25px;font-weight:900}.minorA57{fill:#496b86;font-size:15px;font-weight:800}
        .invT57{fill:#0c4078;font-size:23px;font-weight:900}.invM57{fill:#385f80;font-size:14px;font-weight:750}.invD57{fill:#667f94;font-size:14px}.invC57{fill:#0876d3;font-size:14px;font-weight:900}.hint57{fill:#0f78d5;font-size:14px;font-weight:850}
        .wire57{stroke:#176fc1;stroke-width:3.6;fill:none;stroke-linecap:round;stroke-linejoin:round}.wireSoft57{stroke:#78aeda;stroke-width:2;fill:none}.node57{fill:#fff;stroke:#176fc1;stroke-width:3}
        .callTitle57{fill:#6c8192;font-size:12px;font-weight:800;letter-spacing:.8px}.callMain57{fill:#0b4d91;font-size:18px;font-weight:900}.callMeta57{fill:#58738a;font-size:12.5px;font-weight:750}.branchTag57{fill:#eef7ff;stroke:#c7e0f6}.branchText57{fill:#436b8d;font-size:12px;font-weight:850}
      </style>
      <rect width="${W}" height="${H}" fill="#f8fbff"/>
      <text x="42" y="40" class="title57">Part 1 · System Overview</text>
      <text x="42" y="66" class="sub57">${E(p.name||'Solar Project')} · MDB / AC cable / inverter overview</text>

      <rect x="${mainX}" y="${mainY}" width="${mainW}" height="${mainH}" rx="17" fill="#fff" stroke="#89b9e6" stroke-width="2"/>
      <text x="${cx}" y="${mainY+40}" text-anchor="middle" class="boxT57">MDB MAIN (FACTORY)</text>
      <text x="${cx}" y="${mainY+69}" text-anchor="middle" class="boxS57">Existing Factory Main Distribution Board / PCC</text>

      <path d="M${cx} ${mainY+mainH} V${mdbY}" class="wire57" marker-end="url(#arr57)"/>

      <rect x="${mdbX}" y="${mdbY}" width="${mdbW}" height="${mdbH}" rx="17" fill="#fff" stroke="#2aa56d" stroke-width="2.2"/>
      <text x="${mdbX+32}" y="${mdbY+42}" class="boxT57">MDB SOLAR</text>
      <text x="${mdbX+32}" y="${mdbY+72}" class="boxS57">MA Isolation / AC Collection</text>`;

    if(mdb?.status==='PASS'){
      s+=`<text x="${mdbX+410}" y="${mdbY+54}" class="mainA57">MAIN MCCB ${F(mdb.mainBreakerA)} A</text>
          <text x="${mdbX+410}" y="${mdbY+89}" class="minorA57">INCOMERS: ${F(mdb.feederBreakerQty)} × MCCB ${F(mdb.feederBreakerA)} A</text>`;
    }else s+=`<text x="${mdbX+410}" y="${mdbY+54}" class="mainA57">MAIN MCCB · REVIEW</text>`;

    // MDB SOLAR -> MDB MAIN calculated feeder callout, kept to the right of the vertical cable.
    const mainCallW=460,mainCallX=Math.min(W-mainCallW-35,cx+55),mainCallY=158;
    const mainLine1=mainFeed?.supported?mainFeed.label:'CABLE SIZE · REVIEW';
    const mainLine2=mainFeed?.supported?`Ampacity ${F(mainFeed.totalAmpacity)} A  ·  Main MCCB ${F(mdb.mainBreakerA)} A`:'';
    s+=`<path d="M${cx+7} ${mainCallY+37} H${mainCallX-10}" class="wireSoft57"/>${callout57(mainCallX,mainCallY,mainCallW,'MDB SOLAR → MDB MAIN',mainLine1,mainLine2,'#2aa56d')}`;

    const junctionY=mdbY+mdbH+35;
    s+=`<path d="M${cx} ${mdbY+mdbH} V${junctionY}" class="wire57"/>
        <circle cx="${cx}" cy="${junctionY}" r="7" class="node57"/>
        <path d="M${cx} ${junctionY} V${busY}" class="wire57"/>
        <path d="M${firstCx} ${busY} H${lastCx}" class="wire57"/>`;

    // Main inverter feeder cable callout: larger typography and cleaner CAD-like annotation.
    const invCallW=500,invCallX=Math.min(W-invCallW-35,cx+55),invCallY=junctionY+18;
    const invLine1=c?.supported?String(c.cableLabel||'AC Cable'):'CABLE SIZE · REVIEW';
    const invLine2=c?.supported?`MCCB ${F(c.breakerA)} A each  ·  Ampacity ${F(c.cableAmpacityA)} A`:'';
    s+=`<path d="M${cx+7} ${junctionY} H${invCallX-10}" class="wireSoft57"/>${callout57(invCallX,invCallY,invCallW,'MDB SOLAR → INVERTERS',invLine1,invLine2,'#176fc1')}`;

    for(let i=1;i<=q;i++){
      const x=firstX+(i-1)*(invW+invGap),icx=x+invW/2;
      const ss=(d?.strings||[]).filter(st=>Number(st.inverter_no||1)===i).sort((a,b)=>Number(a.string_no)-Number(b.string_no));
      s+=`<path d="M${icx} ${busY} V${invY}" class="wire57" marker-end="url(#arr57)"/>
        <rect x="${icx-48}" y="${busY+17}" width="96" height="27" rx="8" class="branchTag57"/>
        <text x="${icx}" y="${busY+36}" text-anchor="middle" class="branchText57">FEEDER ${P(i)}</text>
        <g class="inv-card57 inv-card50" data-inverter-no="${i}" style="cursor:pointer;pointer-events:all" role="button" tabindex="0" onclick="window.SolarBOQOverview57&&window.SolarBOQOverview57.openInverter(${i})">
          <rect x="${x}" y="${invY}" width="${invW}" height="${invH}" rx="16" fill="#fff" stroke="#86b8e7" stroke-width="2"/>
          <circle cx="${x+32}" cy="${invY+32}" r="19" fill="#1976d2"/><text x="${x+32}" y="${invY+39}" text-anchor="middle" fill="#fff" font-size="15" font-weight="800">${i}</text>
          <text x="${x+64}" y="${invY+40}" class="invT57">INV-${P(i)}</text>
          <text x="${x+27}" y="${invY+78}" class="invM57">${E(model)}</text>
          <text x="${x+27}" y="${invY+108}" class="invD57">${ss.length} Strings · ${F(inv.num_mppt||d?.num_mppt)} MPPT</text>
          ${c?.supported?`<text x="${x+27}" y="${invY+139}" class="invC57">MCCB ${F(c.breakerA)} A · ${E(c.cableLabel)}</text>`:''}
          <text x="${x+27}" y="${invY+166}" class="hint57">Open String Arrangement →</text>
        </g>`;
    }
    return s+'</svg>';
  }

  const prev57=typeof diagramSvg==='function'?diagramSvg:null;
  if(prev57){diagramSvg=function(d){
    prep57(d);const q=Q(d);
    if(q===1){if(singleDetail57)return prev57(d);return overview57(d);}
    const sel=window.SolarBOQParts50?.getSelected?Number(window.SolarBOQParts50.getSelected()||0):0;
    return sel===0?overview57(d):prev57(d);
  };}

  function rerender57(){if(typeof renderDesign==='function')renderDesign();}
  function open57(n){const d=(typeof state!=='undefined'&&state?.design)?state.design:null;if(d&&Q(d)>1&&window.SolarBOQParts50?.openInverter){window.SolarBOQParts50.openInverter(n);return;}singleDetail57=true;rerender57();}
  function overviewMode57(){const d=(typeof state!=='undefined'&&state?.design)?state.design:null;if(d&&Q(d)>1&&window.SolarBOQParts50?.overview){window.SolarBOQParts50.overview();return;}singleDetail57=false;rerender57();}

  const prevRender57=typeof renderDesign==='function'?renderDesign:null;
  if(prevRender57){renderDesign=function(){prevRender57();if(typeof document==='undefined'||typeof state==='undefined'||!state?.design)return;const out=document.getElementById('designOut');if(!out)return;if(Q(state.design)===1){let nav=document.getElementById('singleNav57');if(nav)nav.remove();const old=document.getElementById('singleNav56');if(old)old.remove();nav=document.createElement('div');nav.id='singleNav57';nav.className='part-nav57';nav.innerHTML=`<button class="${!singleDetail57?'active':''}" data-mode="overview">Part 1 · Overview</button><button class="${singleDetail57?'active':''}" data-mode="detail">INV-01 · String Detail</button>`;out.insertBefore(nav,out.firstChild);nav.onclick=ev=>{const b=ev.target.closest('button');if(!b)return;b.dataset.mode==='detail'?open57(1):overviewMode57();};}};}

  if(typeof document!=='undefined'&&!document.getElementById('uat57Style')){const st=document.createElement('style');st.id='uat57Style';st.textContent=`.sld57{width:100%;min-width:1500px;display:block;border-radius:14px;background:#f8fbff}#designOut{overflow-x:auto}.inv-card57:hover rect{stroke:#1976d2;stroke-width:3;filter:drop-shadow(0 5px 10px rgba(25,118,210,.14))}.part-nav57{display:flex;gap:8px;flex-wrap:wrap;padding:10px 0 12px;background:#fff}.part-nav57 button{border:1px solid #bfd7ec;background:#f7fbff;color:#315a7c;border-radius:9px;padding:10px 14px;font-weight:750;cursor:pointer}.part-nav57 button.active{background:#147bd1;color:#fff;border-color:#147bd1}`;document.head.appendChild(st);}

  window.SolarBOQOverview57={overviewSvg:overview57,openInverter:open57,overview:overviewMode57,mainFeeder:mainFeeder57};
})();
