// UAT v0.5.0 - Split multi-inverter SLD into 2 parts
// Part 1: MDB MAIN -> MDB SOLAR -> inverter overview
// Part 2: click an inverter to open its MPPT / String / Panel allocation
(function(){
  const esc50=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const fmt50=(v,d=0)=>{const n=Number(v||0);return Number.isFinite(n)?n.toLocaleString(undefined,{maximumFractionDigits:d}):'-';};
  const pad50=v=>String(v).padStart(2,'0');
  const qty50=d=>Math.max(1,Number(d?.project?.inverter_qty||d?.inverter_qty||1));
  let selectedInv50=0;

  function prep50(d){
    if(window.SolarBOQMulti47?.allocate){try{window.SolarBOQMulti47.allocate(d);}catch(_e){}}
    return d;
  }

  function groups50(d,invNo){
    if(window.SolarBOQMulti47?.groups){try{return window.SolarBOQMulti47.groups(d,invNo);}catch(_e){}}
    const inv=d?.inverter||{},mppt=Math.max(1,Number(inv.num_mppt||d?.num_mppt||1)),inputs=Math.max(1,Number(inv.inputs_per_mppt||d?.inputs_per_mppt||1));
    const all=(d?.strings||[]).filter(s=>Number(s.inverter_no||1)===invNo);
    return Array.from({length:mppt},(_,i)=>{
      const n=i+1,strings=all.filter(s=>Number(s.mppt)===n).sort((a,b)=>Number(a.input_no)-Number(b.input_no)||Number(a.string_no)-Number(b.string_no));
      return {mppt:n,strings,used:strings.length,capacity:inputs};
    });
  }

  function model50(d){const inv=d?.inverter||{},p=d?.project||{};return ((inv.manufacturer||'')+' '+(inv.model||p.inverter_model||'INVERTER')).trim();}

  function overview50(d){
    prep50(d);
    const q=qty50(d),p=d?.project||{},cable=window.SolarBOQCable45?.calculate?window.SolarBOQCable45.calculate(d):null,mdb=window.SolarBOQMDB46?.calculate?window.SolarBOQMDB46.calculate(d):null;
    const model=model50(d),W=Math.max(1500,320*q+140),H=720,center=W/2;
    const mainW=520,mainH=90,mainX=center-mainW/2,mainY=60;
    const mdbW=700,mdbH=132,mdbX=center-mdbW/2,mdbY=205;
    const invGap=34,invW=Math.min(360,(W-120-(q-1)*invGap)/q),invH=170,invY=470;
    const firstX=(W-(q*invW+(q-1)*invGap))/2;
    let s=`<svg id="stringSvg" class="engineering-svg sld50 overview50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
      <defs><marker id="arr50" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#1976d2"/></marker></defs>
      <style>
        text{font-family:Segoe UI,Arial,sans-serif}.title50{fill:#0a3768;font-size:29px;font-weight:800}.sub50{fill:#6d8498;font-size:14px}.boxT50{fill:#0c4078;font-size:23px;font-weight:800}.boxS50{fill:#607b94;font-size:14px}.mainA50{fill:#0876d3;font-size:22px;font-weight:900}.minorA50{fill:#476a87;font-size:14px;font-weight:700}.invT50{fill:#0c4078;font-size:22px;font-weight:900}.invM50{fill:#385f80;font-size:13px;font-weight:700}.invD50{fill:#617c92;font-size:13px}.invC50{fill:#0876d3;font-size:13px;font-weight:800}.hint50{fill:#0f78d5;font-size:13px;font-weight:800}.wire50{stroke:#1976d2;stroke-width:3;fill:none}.node50{fill:#1976d2;stroke:#fff;stroke-width:2}
      </style>
      <rect width="${W}" height="${H}" fill="#f8fbff"/>
      <text x="42" y="38" class="title50">Part 1 · System Overview</text><text x="42" y="61" class="sub50">${esc50(p.name||'Solar Project')} · Click an inverter to open String Arrangement</text>
      <rect x="${mainX}" y="${mainY}" width="${mainW}" height="${mainH}" rx="16" fill="#fff" stroke="#89b9e6" stroke-width="1.8"/>
      <text x="${center}" y="${mainY+38}" text-anchor="middle" class="boxT50">MDB MAIN (FACTORY)</text>
      <text x="${center}" y="${mainY+65}" text-anchor="middle" class="boxS50">Existing Factory Main Distribution Board / PCC</text>
      <path d="M${center} ${mainY+mainH} V${mdbY}" class="wire50" marker-end="url(#arr50)"/>
      <rect x="${mdbX}" y="${mdbY}" width="${mdbW}" height="${mdbH}" rx="16" fill="#fff" stroke="#2aa56d" stroke-width="2"/>
      <text x="${mdbX+28}" y="${mdbY+38}" class="boxT50">MDB SOLAR</text>
      <text x="${mdbX+28}" y="${mdbY+66}" class="boxS50">MA Isolation / AC Collection</text>`;
    if(mdb?.required&&mdb.status==='PASS'){
      s+=`<text x="${mdbX+340}" y="${mdbY+46}" class="mainA50">MAIN MCCB ${fmt50(mdb.mainBreakerA)} A</text>
          <text x="${mdbX+340}" y="${mdbY+78}" class="minorA50">INCOMERS: ${fmt50(mdb.feederBreakerQty)} × MCCB ${fmt50(mdb.feederBreakerA)} A</text>`;
    }
    const busY=410;
    s+=`<path d="M${center} ${mdbY+mdbH} V${busY}" class="wire50"/><path d="M${firstX+invW/2} ${busY} H${firstX+(q-1)*(invW+invGap)+invW/2}" class="wire50"/>`;
    for(let i=1;i<=q;i++){
      const x=firstX+(i-1)*(invW+invGap),cx=x+invW/2;
      const ss=(d?.strings||[]).filter(st=>Number(st.inverter_no||1)===i).sort((a,b)=>Number(a.string_no)-Number(b.string_no));
      s+=`<path d="M${cx} ${busY} V${invY}" class="wire50" marker-end="url(#arr50)"/>
        <g class="inv-card50" data-inverter-no="${i}" style="cursor:pointer">
          <rect x="${x}" y="${invY}" width="${invW}" height="${invH}" rx="16" fill="#fff" stroke="#86b8e7" stroke-width="2"/>
          <circle cx="${x+31}" cy="${invY+31}" r="18" fill="#1976d2"/><text x="${x+31}" y="${invY+37}" text-anchor="middle" fill="#fff" font-size="14" font-weight="800">${i}</text>
          <text x="${x+61}" y="${invY+38}" class="invT50">INV-${pad50(i)}</text>
          <text x="${x+26}" y="${invY+73}" class="invM50">${esc50(model)}</text>
          <text x="${x+26}" y="${invY+101}" class="invD50">${ss.length} Strings · ${fmt50(d?.inverter?.num_mppt||d?.num_mppt)} MPPT</text>
          ${cable?.supported?`<text x="${x+26}" y="${invY+129}" class="invC50">MCCB ${fmt50(cable.breakerA)} A · ${esc50(cable.cableLabel)}</text>`:''}
          <text x="${x+26}" y="${invY+155}" class="hint50">Open String Arrangement →</text>
        </g>`;
    }
    return s+'</svg>';
  }

  function detail50(d,invNo){
    prep50(d);
    const p=d?.project||{},inv=d?.inverter||{},cable=window.SolarBOQCable45?.calculate?window.SolarBOQCable45.calculate(d):null,model=model50(d);
    const gs=groups50(d,invNo),ss=(d?.strings||[]).filter(st=>Number(st.inverter_no||1)===invNo).sort((a,b)=>Number(a.string_no)-Number(b.string_no));
    const cols=Math.min(4,Math.max(2,gs.length)),gap=18,margin=44,cardW=330,cardH=Math.max(132,58+Math.max(1,Number(inv.inputs_per_mppt||d?.inputs_per_mppt||1))*34),rows=Math.ceil(gs.length/cols);
    const W=Math.max(1500,margin*2+cols*cardW+(cols-1)*gap),invW=560,invH=142,invX=(W-invW)/2,invY=115,gridY=335,H=gridY+rows*(cardH+24)+70;
    let s=`<svg id="stringSvg" class="engineering-svg sld50 detail50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
      <style>
        text{font-family:Segoe UI,Arial,sans-serif}.title50{fill:#0a3768;font-size:29px;font-weight:800}.sub50{fill:#6d8498;font-size:14px}.back50{fill:#0f78d5;font-size:14px;font-weight:800}.invT50{fill:#0c4078;font-size:24px;font-weight:900}.invM50{fill:#385f80;font-size:13px;font-weight:700}.invD50{fill:#617c92;font-size:13px}.invC50{fill:#0876d3;font-size:13px;font-weight:800}.mpT50{fill:#0b4d91;font-size:17px;font-weight:900}.cnt50{fill:#d77c00;font-size:14px;font-weight:900}.str50{fill:#234e73;font-size:14px;font-weight:800}.pan50{fill:#628099;font-size:12px;font-weight:700}.spare50{fill:#9aaebe;font-size:13px;font-weight:700}.wire50{stroke:#1976d2;stroke-width:2.5;fill:none}.wireThin50{stroke:#72a9d8;stroke-width:1.8;fill:none}.node50{fill:#1976d2;stroke:#fff;stroke-width:2}
      </style>
      <rect width="${W}" height="${H}" fill="#f8fbff"/>
      <g class="back-overview50" style="cursor:pointer"><rect x="${margin}" y="22" width="180" height="40" rx="10" fill="#fff" stroke="#9bc5ec"/><text x="${margin+18}" y="48" class="back50">← Back to Overview</text></g>
      <text x="${W/2}" y="48" text-anchor="middle" class="title50">Part 2 · INV-${pad50(invNo)} String Arrangement</text>
      <text x="${W/2}" y="73" text-anchor="middle" class="sub50">${esc50(p.name||'Solar Project')} · MPPT / String / Panel mapping</text>
      <rect x="${invX}" y="${invY}" width="${invW}" height="${invH}" rx="16" fill="#fff" stroke="#7fb5e7" stroke-width="2"/>
      <circle cx="${invX+37}" cy="${invY+35}" r="20" fill="#1976d2"/><text x="${invX+37}" y="${invY+42}" text-anchor="middle" fill="#fff" font-size="15" font-weight="800">${invNo}</text>
      <text x="${invX+72}" y="${invY+43}" class="invT50">INV-${pad50(invNo)}</text>
      <text x="${invX+28}" y="${invY+76}" class="invM50">${esc50(model)}</text>
      <text x="${invX+28}" y="${invY+104}" class="invD50">${ss.length} Strings · ${fmt50(inv.num_mppt||d?.num_mppt)} MPPT</text>
      ${cable?.supported?`<text x="${invX+28}" y="${invY+130}" class="invC50">MCCB ${fmt50(cable.breakerA)} A · ${esc50(cable.cableLabel)}</text>`:''}
      <path d="M${W/2} ${invY+invH} V${gridY-42}" class="wire50"/>
      <path d="M${margin+cardW/2} ${gridY-42} H${W-margin-cardW/2}" class="wire50"/>`;
    gs.forEach((g,j)=>{
      const r=Math.floor(j/cols),c=j%cols,x=margin+c*(cardW+gap),y=gridY+r*(cardH+24),cx=x+cardW/2;
      s+=`<path d="M${cx} ${gridY-42} V${y}" class="wireThin50"/>
        <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="12" fill="#fff" stroke="#b7d7f4"/>
        <rect x="${x}" y="${y}" width="${cardW}" height="42" rx="12" fill="#eaf5ff"/>
        <text x="${x+15}" y="${y+28}" class="mpT50">MPPT${g.mppt}</text>
        <text x="${x+cardW-15}" y="${y+28}" text-anchor="end" class="cnt50">${g.used}/${g.capacity}</text>`;
      if(!g.strings.length)s+=`<text x="${x+18}" y="${y+78}" class="spare50">SPARE</text>`;
      g.strings.forEach((st,k)=>{
        const yy=y+72+k*34;
        s+=`<circle cx="${x+18}" cy="${yy-4}" r="4" class="node50"/><path d="M${x+22} ${yy-4} H${x+37}" class="wireThin50"/>
          <text x="${x+46}" y="${yy}" class="str50">S${pad50(st.string_no)} → ${fmt50(st.modules)} Panels → IN${fmt50(st.input_no)}</text>`;
      });
      s+='</g>';
    });
    return s+'</svg>';
  }

  const prevDiagram50=typeof diagramSvg==='function'?diagramSvg:null;
  if(prevDiagram50){
    diagramSvg=function(d){
      prep50(d);
      if(qty50(d)<=1)return prevDiagram50(d);
      if(selectedInv50>qty50(d))selectedInv50=0;
      return selectedInv50?detail50(d,selectedInv50):overview50(d);
    };
  }

  function rerender50(){if(typeof renderDesign==='function')renderDesign();}
  function openInv50(n){selectedInv50=Math.max(1,Number(n||1));rerender50();}
  function overviewMode50(){selectedInv50=0;rerender50();}

  const prevRender50=typeof renderDesign==='function'?renderDesign:null;
  if(prevRender50){
    renderDesign=function(){
      prevRender50();
      if(typeof document==='undefined'||!state?.design||qty50(state.design)<=1)return;
      const out=document.getElementById('designOut');if(!out)return;
      let nav=document.getElementById('partNav50');
      if(nav)nav.remove();
      nav=document.createElement('div');nav.id='partNav50';nav.className='part-nav50';
      const q=qty50(state.design);
      nav.innerHTML=`<button class="${selectedInv50===0?'active':''}" data-mode="overview">Part 1 · Overview</button>${Array.from({length:q},(_,i)=>`<button class="${selectedInv50===i+1?'active':''}" data-inv="${i+1}">INV-${pad50(i+1)} · String Detail</button>`).join('')}`;
      out.insertBefore(nav,out.firstChild);
      nav.addEventListener('click',ev=>{
        const b=ev.target.closest('button');if(!b)return;
        if(b.dataset.mode==='overview')overviewMode50();else if(b.dataset.inv)openInv50(Number(b.dataset.inv));
      });
      const svg=document.getElementById('stringSvg');
      if(svg){
        svg.addEventListener('click',ev=>{
          const inv=ev.target.closest('.inv-card50');if(inv?.dataset?.inverterNo){openInv50(Number(inv.dataset.inverterNo));return;}
          if(ev.target.closest('.back-overview50'))overviewMode50();
        });
      }
    };
  }

  if(typeof document!=='undefined'&&!document.getElementById('uat50Style')){
    const st=document.createElement('style');st.id='uat50Style';st.textContent=`
      #designOut{overflow-x:auto}.sld50{width:100%;min-width:1450px;display:block;border-radius:14px;background:#f8fbff}.inv-card50:hover rect{stroke:#1976d2;stroke-width:3}.part-nav50{position:sticky;left:0;display:flex;gap:8px;flex-wrap:wrap;padding:10px 0 12px;background:#fff;z-index:3}.part-nav50 button{border:1px solid #bfd7ec;background:#f7fbff;color:#315a7c;border-radius:9px;padding:9px 13px;font-weight:700;cursor:pointer}.part-nav50 button.active{background:#147bd1;color:#fff;border-color:#147bd1}.back-overview50:hover rect{stroke:#1976d2;stroke-width:2}`;
    document.head.appendChild(st);
  }

  window.SolarBOQParts50={openInverter:openInv50,overview:overviewMode50,getSelected:()=>selectedInv50,overviewSvg:overview50,detailSvg:detail50};
})();
