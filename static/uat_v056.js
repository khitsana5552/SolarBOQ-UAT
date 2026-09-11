// UAT v0.5.6 - Cleaner engineering overview + AC feeder labels on SLD lines
// Always shows MDB MAIN -> MDB SOLAR -> inverter(s), including single-inverter projects.
// Keeps existing String Detail renderers; this file only replaces the system overview/navigation shell.
(function(){
  const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const F=(v,d=0)=>{const n=Number(v||0);return Number.isFinite(n)?n.toLocaleString(undefined,{maximumFractionDigits:d}):'-';};
  const P=v=>String(v).padStart(2,'0');
  const Q=d=>Math.max(1,Number(d?.project?.inverter_qty||d?.inverter_qty||1));
  let singleDetail56=false;

  function model56(d){const inv=d?.inverter||{},p=d?.project||{};return ((inv.manufacturer||'')+' '+(inv.model||p.inverter_model||'INVERTER')).trim();}
  function prep56(d){if(window.SolarBOQMulti47?.allocate){try{window.SolarBOQMulti47.allocate(d);}catch(_e){}}return d;}
  function cable56(d){return window.SolarBOQCable45?.calculate?window.SolarBOQCable45.calculate(d):null;}
  function mdb56(d,cable){
    const q=Q(d),raw=window.SolarBOQMDB46?.calculate?window.SolarBOQMDB46.calculate(d):null;
    if(raw?.status==='PASS')return raw;
    if(cable?.supported){
      return {required:true,status:'PASS',feederBreakerQty:q,feederBreakerA:Number(cable.breakerA||0),mainBreakerA:Number(cable.breakerA||0)*q};
    }
    return raw||{required:true,status:'REVIEW',feederBreakerQty:q,feederBreakerA:0,mainBreakerA:0};
  }

  function overview56(d){
    prep56(d);
    const q=Q(d),p=d?.project||{},inv=d?.inverter||{},cable=cable56(d),mdb=mdb56(d,cable),model=model56(d);
    const W=Math.max(1500,380*q+180),H=760,cx=W/2;
    const mainW=520,mainH=92,mainX=cx-mainW/2,mainY=70;
    const mdbW=760,mdbH=142,mdbX=cx-mdbW/2,mdbY=220;
    const invGap=36,invW=Math.min(360,(W-130-(q-1)*invGap)/q),invH=174,invY=515;
    const firstX=(W-(q*invW+(q-1)*invGap))/2;
    const busY=440,firstCx=firstX+invW/2,lastCx=firstX+(q-1)*(invW+invGap)+invW/2;
    const cableLabel=cable?.supported?String(cable.cableLabel||'AC Cable'):'Cable: Review';
    const feederLabel=cable?.supported?`AC FEEDER CABLE · ${cableLabel} · MCCB ${F(cable.breakerA)} A EACH`:'AC FEEDER CABLE · REVIEW';

    let s=`<svg id="stringSvg" class="engineering-svg sld56" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
      <defs><marker id="arr56" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#1679d2"/></marker></defs>
      <style>
        text{font-family:Segoe UI,Arial,sans-serif}.title56{fill:#0a3768;font-size:28px;font-weight:850}.sub56{fill:#73899b;font-size:13px}.boxT56{fill:#0c4078;font-size:23px;font-weight:850}.boxS56{fill:#6a8093;font-size:13px}
        .mainA56{fill:#0876d3;font-size:23px;font-weight:900}.minorA56{fill:#496b86;font-size:14px;font-weight:750}.invT56{fill:#0c4078;font-size:22px;font-weight:900}.invM56{fill:#385f80;font-size:13px;font-weight:750}.invD56{fill:#667f94;font-size:13px}.invC56{fill:#0876d3;font-size:13px;font-weight:850}.hint56{fill:#0f78d5;font-size:13px;font-weight:850}
        .wire56{stroke:#1679d2;stroke-width:3;fill:none}.wireThin56{stroke:#70a9da;stroke-width:1.8;fill:none}.node56{fill:#fff;stroke:#1679d2;stroke-width:2.4}.label56{fill:#315d80;font-size:13px;font-weight:800;letter-spacing:.2px}.labelBg56{fill:#f8fbff;stroke:#d3e6f6;stroke-width:1}
        .tag56{fill:#eef7ff;stroke:#c7e0f6;stroke-width:1}.tagT56{fill:#52718a;font-size:11px;font-weight:800}
      </style>
      <rect width="${W}" height="${H}" fill="#f8fbff"/>
      <text x="42" y="38" class="title56">Part 1 · System Overview</text>
      <text x="42" y="60" class="sub56">${E(p.name||'Solar Project')} · MDB / AC feeder / inverter overview</text>

      <rect x="${mainX}" y="${mainY}" width="${mainW}" height="${mainH}" rx="16" fill="#fff" stroke="#89b9e6" stroke-width="1.8"/>
      <text x="${cx}" y="${mainY+39}" text-anchor="middle" class="boxT56">MDB MAIN (FACTORY)</text>
      <text x="${cx}" y="${mainY+66}" text-anchor="middle" class="boxS56">Existing Factory Main Distribution Board / PCC</text>
      <path d="M${cx} ${mainY+mainH} V${mdbY}" class="wire56" marker-end="url(#arr56)"/>

      <rect x="${mdbX}" y="${mdbY}" width="${mdbW}" height="${mdbH}" rx="16" fill="#fff" stroke="#2aa56d" stroke-width="2"/>
      <text x="${mdbX+30}" y="${mdbY+40}" class="boxT56">MDB SOLAR</text>
      <text x="${mdbX+30}" y="${mdbY+68}" class="boxS56">MA Isolation / AC Collection</text>`;

    if(mdb?.status==='PASS'){
      s+=`<text x="${mdbX+380}" y="${mdbY+50}" class="mainA56">MAIN MCCB ${F(mdb.mainBreakerA)} A</text>
          <text x="${mdbX+380}" y="${mdbY+82}" class="minorA56">INCOMERS: ${F(mdb.feederBreakerQty)} × MCCB ${F(mdb.feederBreakerA)} A</text>`;
    }else{
      s+=`<text x="${mdbX+380}" y="${mdbY+50}" class="mainA56">MAIN MCCB · REVIEW</text>`;
    }

    // AC collection point and feeder bus. Junction is explicit, like a CAD single-line connection point.
    const junctionY=mdbY+mdbH+30;
    s+=`<path d="M${cx} ${mdbY+mdbH} V${junctionY}" class="wire56"/>
        <circle cx="${cx}" cy="${junctionY}" r="7" class="node56"/>
        <path d="M${cx} ${junctionY} V${busY}" class="wire56"/>
        <path d="M${firstCx} ${busY} H${lastCx}" class="wire56"/>`;

    // Cable callout is placed directly on the feeder line, CAD-style, but kept readable in the web UI.
    const labelW=Math.min(650,Math.max(430,feederLabel.length*7.2)),labelX=Math.min(W-labelW-40,cx+34),labelY=junctionY+18;
    s+=`<path d="M${cx+8} ${junctionY} H${labelX-10}" class="wireThin56"/>
        <rect x="${labelX}" y="${labelY-20}" width="${labelW}" height="32" rx="7" class="labelBg56"/>
        <text x="${labelX+14}" y="${labelY+2}" class="label56">${E(feederLabel)}</text>`;

    for(let i=1;i<=q;i++){
      const x=firstX+(i-1)*(invW+invGap),icx=x+invW/2;
      const ss=(d?.strings||[]).filter(st=>Number(st.inverter_no||1)===i).sort((a,b)=>Number(a.string_no)-Number(b.string_no));
      const tag=`FEEDER ${P(i)}`;
      s+=`<path d="M${icx} ${busY} V${invY}" class="wire56" marker-end="url(#arr56)"/>
        <rect x="${icx-43}" y="${busY+15}" width="86" height="24" rx="7" class="tag56"/>
        <text x="${icx}" y="${busY+32}" text-anchor="middle" class="tagT56">${tag}</text>
        <g class="inv-card56 inv-card50" data-inverter-no="${i}" style="cursor:pointer;pointer-events:all" role="button" tabindex="0" onclick="window.SolarBOQOverview56&&window.SolarBOQOverview56.openInverter(${i})">
          <rect x="${x}" y="${invY}" width="${invW}" height="${invH}" rx="16" fill="#fff" stroke="#86b8e7" stroke-width="2"/>
          <circle cx="${x+31}" cy="${invY+31}" r="18" fill="#1976d2"/><text x="${x+31}" y="${invY+37}" text-anchor="middle" fill="#fff" font-size="14" font-weight="800">${i}</text>
          <text x="${x+61}" y="${invY+38}" class="invT56">INV-${P(i)}</text>
          <text x="${x+26}" y="${invY+73}" class="invM56">${E(model)}</text>
          <text x="${x+26}" y="${invY+101}" class="invD56">${ss.length} Strings · ${F(inv.num_mppt||d?.num_mppt)} MPPT</text>
          ${cable?.supported?`<text x="${x+26}" y="${invY+129}" class="invC56">MCCB ${F(cable.breakerA)} A · ${E(cableLabel)}</text>`:''}
          <text x="${x+26}" y="${invY+156}" class="hint56">Open String Arrangement →</text>
        </g>`;
    }
    return s+'</svg>';
  }

  const prev56=typeof diagramSvg==='function'?diagramSvg:null;
  if(prev56){
    diagramSvg=function(d){
      prep56(d);
      const q=Q(d);
      if(q===1){
        if(singleDetail56)return prev56(d);
        return overview56(d);
      }
      const selected=window.SolarBOQParts50?.getSelected?Number(window.SolarBOQParts50.getSelected()||0):0;
      if(selected===0)return overview56(d);
      return prev56(d);
    };
  }

  function rerender56(){if(typeof renderDesign==='function')renderDesign();}
  function open56(n){
    const d=(typeof state!=='undefined'&&state?.design)?state.design:null;
    if(d&&Q(d)>1&&window.SolarBOQParts50?.openInverter){window.SolarBOQParts50.openInverter(n);return;}
    singleDetail56=true;rerender56();
  }
  function overviewMode56(){
    const d=(typeof state!=='undefined'&&state?.design)?state.design:null;
    if(d&&Q(d)>1&&window.SolarBOQParts50?.overview){window.SolarBOQParts50.overview();return;}
    singleDetail56=false;rerender56();
  }

  const prevRender56=typeof renderDesign==='function'?renderDesign:null;
  if(prevRender56){
    renderDesign=function(){
      prevRender56();
      if(typeof document==='undefined'||typeof state==='undefined'||!state?.design)return;
      const out=document.getElementById('designOut');if(!out)return;
      if(Q(state.design)===1){
        let nav=document.getElementById('singleNav56');if(nav)nav.remove();
        nav=document.createElement('div');nav.id='singleNav56';nav.className='part-nav56';
        nav.innerHTML=`<button class="${!singleDetail56?'active':''}" data-mode="overview">Part 1 · Overview</button><button class="${singleDetail56?'active':''}" data-mode="detail">INV-01 · String Detail</button>`;
        out.insertBefore(nav,out.firstChild);
        nav.onclick=ev=>{const b=ev.target.closest('button');if(!b)return;b.dataset.mode==='detail'?open56(1):overviewMode56();};
      }
    };
  }

  if(typeof document!=='undefined'&&!document.getElementById('uat56Style')){
    const st=document.createElement('style');st.id='uat56Style';st.textContent=`
      .sld56{width:100%;min-width:1450px;display:block;border-radius:14px;background:#f8fbff}#designOut{overflow-x:auto}.inv-card56:hover rect{stroke:#1976d2;stroke-width:3;filter:drop-shadow(0 4px 8px rgba(25,118,210,.12))}.part-nav56{display:flex;gap:8px;flex-wrap:wrap;padding:10px 0 12px;background:#fff}.part-nav56 button{border:1px solid #bfd7ec;background:#f7fbff;color:#315a7c;border-radius:9px;padding:9px 13px;font-weight:700;cursor:pointer}.part-nav56 button.active{background:#147bd1;color:#fff;border-color:#147bd1}`;document.head.appendChild(st);
  }

  window.SolarBOQOverview56={overviewSvg:overview56,openInverter:open56,overview:overviewMode56};
})();
