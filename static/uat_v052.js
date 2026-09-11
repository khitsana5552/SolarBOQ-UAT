// UAT v0.5.2 - Clean Part 2 routing: no lines pass through MPPT cards/text
(function(){
  const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[c]));
  const F=(v,d=0)=>{const n=Number(v||0);return Number.isFinite(n)?n.toLocaleString(undefined,{maximumFractionDigits:d}):'-';};
  const P=v=>String(v).padStart(2,'0');

  function prep(d){if(window.SolarBOQMulti47?.allocate){try{window.SolarBOQMulti47.allocate(d);}catch(_e){}}return d;}
  function groups(d,invNo){
    if(window.SolarBOQMulti47?.groups){try{return window.SolarBOQMulti47.groups(d,invNo);}catch(_e){}}
    const inv=d?.inverter||{},m=Math.max(1,Number(inv.num_mppt||d?.num_mppt||1)),ipm=Math.max(1,Number(inv.inputs_per_mppt||d?.inputs_per_mppt||1));
    const all=(d?.strings||[]).filter(s=>Number(s.inverter_no||1)===invNo);
    return Array.from({length:m},(_,i)=>{const n=i+1,ss=all.filter(s=>Number(s.mppt)===n).sort((a,b)=>Number(a.input_no)-Number(b.input_no)||Number(a.string_no)-Number(b.string_no));return {mppt:n,strings:ss,used:ss.length,capacity:ipm};});
  }
  function model(d){const inv=d?.inverter||{},p=d?.project||{};return ((inv.manufacturer||'')+' '+(inv.model||p.inverter_model||'INVERTER')).trim();}

  function detail52(d,invNo){
    prep(d);
    const p=d?.project||{},inv=d?.inverter||{},cable=window.SolarBOQCable45?.calculate?window.SolarBOQCable45.calculate(d):null;
    const gs=groups(d,invNo),ss=(d?.strings||[]).filter(st=>Number(st.inverter_no||1)===invNo).sort((a,b)=>Number(a.string_no)-Number(b.string_no));
    const cols=Math.min(4,Math.max(2,gs.length)),gapX=20,margin=46,cardW=330;
    const inputs=Math.max(1,Number(inv.inputs_per_mppt||d?.inputs_per_mppt||1));
    const cardH=Math.max(132,62+inputs*36),rows=Math.ceil(gs.length/cols);
    const rowGap=88,invW=580,invH=145,W=Math.max(1500,margin*2+cols*cardW+(cols-1)*gapX),invX=(W-invW)/2,invY=112;
    const firstRowY=360,rowPitch=cardH+rowGap,H=firstRowY+rows*rowPitch+40;
    let s=`<svg id="stringSvg" class="engineering-svg sld52 detail52" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
    <style>
      text{font-family:Segoe UI,Arial,sans-serif}.t52{fill:#0a3768;font-size:29px;font-weight:800}.sub52{fill:#70879a;font-size:14px}.back52{fill:#0e75cf;font-size:14px;font-weight:800}
      .invT52{fill:#0c4078;font-size:24px;font-weight:900}.invM52{fill:#365d7e;font-size:13px;font-weight:700}.invD52{fill:#617c92;font-size:13px}.invC52{fill:#0876d3;font-size:13px;font-weight:800}
      .mpT52{fill:#0b4d91;font-size:17px;font-weight:900}.cnt52{fill:#d77c00;font-size:14px;font-weight:900}.str52{fill:#234e73;font-size:14px;font-weight:800}.sp52{fill:#98acbc;font-size:13px;font-weight:700}
      .main52{stroke:#1976d2;stroke-width:2.8;fill:none}.drop52{stroke:#71a9da;stroke-width:1.8;fill:none}.node52{fill:#1976d2;stroke:#fff;stroke-width:2}
    </style>
    <rect width="${W}" height="${H}" fill="#f8fbff"/>
    <g class="back-overview50" style="cursor:pointer;pointer-events:all" onclick="window.SolarBOQParts50&&window.SolarBOQParts50.overview()"><rect x="${margin}" y="22" width="180" height="40" rx="10" fill="#fff" stroke="#9bc5ec"/><text x="${margin+18}" y="48" class="back52">← Back to Overview</text></g>
    <text x="${W/2}" y="48" text-anchor="middle" class="t52">Part 2 · INV-${P(invNo)} String Arrangement</text>
    <text x="${W/2}" y="73" text-anchor="middle" class="sub52">${E(p.name||'Solar Project')} · MPPT / String / Panel mapping</text>
    <rect x="${invX}" y="${invY}" width="${invW}" height="${invH}" rx="16" fill="#fff" stroke="#7fb5e7" stroke-width="2"/>
    <circle cx="${invX+38}" cy="${invY+36}" r="20" fill="#1976d2"/><text x="${invX+38}" y="${invY+43}" text-anchor="middle" fill="#fff" font-size="15" font-weight="800">${invNo}</text>
    <text x="${invX+74}" y="${invY+44}" class="invT52">INV-${P(invNo)}</text>
    <text x="${invX+28}" y="${invY+78}" class="invM52">${E(model(d))}</text>
    <text x="${invX+28}" y="${invY+106}" class="invD52">${ss.length} Strings · ${F(inv.num_mppt||d?.num_mppt)} MPPT</text>
    ${cable?.supported?`<text x="${invX+28}" y="${invY+132}" class="invC52">MCCB ${F(cable.breakerA)} A · ${E(cable.cableLabel)}</text>`:''}`;

    // Main drop stops in the routing gutter, never inside any card.
    const center=W/2,topBusY=315;
    s+=`<path d="M${center} ${invY+invH} V${topBusY}" class="main52"/>`;

    for(let r=0;r<rows;r++){
      const start=r*cols,end=Math.min(gs.length,start+cols),count=end-start;
      const rowY=firstRowY+r*rowPitch,busY=rowY-34;
      const xFirst=margin+cardW/2,xLast=margin+(count-1)*(cardW+gapX)+cardW/2;
      if(r===0){s+=`<path d="M${center} ${topBusY} V${busY}" class="main52"/>`;}
      else{
        // route through the left gutter between card rows; it never crosses card content
        const gutterX=margin-18;
        s+=`<path d="M${center} ${topBusY} H${gutterX} V${busY} H${xFirst}" class="main52"/>`;
      }
      s+=`<path d="M${xFirst} ${busY} H${xLast}" class="main52"/>`;
      for(let j=start;j<end;j++){
        const c=j-start,g=gs[j],x=margin+c*(cardW+gapX),cx=x+cardW/2,y=rowY;
        // short connector terminates exactly at card top edge
        s+=`<path d="M${cx} ${busY} V${y-7}" class="drop52"/><circle cx="${cx}" cy="${y-5}" r="5" class="node52"/>
          <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="12" fill="#fff" stroke="#b7d7f4"/>
          <rect x="${x}" y="${y}" width="${cardW}" height="42" rx="12" fill="#eaf5ff"/>
          <text x="${x+15}" y="${y+28}" class="mpT52">MPPT${g.mppt}</text><text x="${x+cardW-15}" y="${y+28}" text-anchor="end" class="cnt52">${g.used}/${g.capacity}</text>`;
        if(!g.strings.length)s+=`<text x="${x+18}" y="${y+82}" class="sp52">SPARE</text>`;
        g.strings.forEach((st,k)=>{
          const yy=y+76+k*36;
          s+=`<circle cx="${x+18}" cy="${yy-5}" r="4" class="node52"/><path d="M${x+22} ${yy-5} H${x+38}" class="drop52"/><text x="${x+48}" y="${yy}" class="str52">S${P(st.string_no)} → ${F(st.modules)} Panels → IN${F(st.input_no)}</text>`;
        });
      }
    }
    return s+'</svg>';
  }

  const prev52=typeof diagramSvg==='function'?diagramSvg:null;
  if(prev52){
    diagramSvg=function(d){
      const n=window.SolarBOQParts50?.getSelected?Number(window.SolarBOQParts50.getSelected()||0):0;
      if(n>0 && Math.max(1,Number(d?.project?.inverter_qty||d?.inverter_qty||1))>1)return detail52(d,n);
      return prev52(d);
    };
  }

  if(typeof document!=='undefined'&&!document.getElementById('uat52Style')){
    const st=document.createElement('style');st.id='uat52Style';st.textContent=`.sld52{width:100%;min-width:1450px;display:block;border-radius:14px;background:#f8fbff}#designOut{overflow-x:auto}.detail52 text{paint-order:stroke;stroke:rgba(255,255,255,.10);stroke-width:.2px}`;document.head.appendChild(st);
  }
  window.SolarBOQPart2Fix52={detailSvg:detail52};
})();