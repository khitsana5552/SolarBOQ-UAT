// UAT v0.5.5 - Unified light String Arrangement layout for single-inverter projects
// Replaces the legacy dark SLD used by 50K/100K single-inverter projects so the visual language
// matches the newer 100K/150K Part 2 layout. Keeps Huawei manual PV terminal mapping when available.
(function(){
  const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const F=(v,d=0)=>{const n=Number(v||0);return Number.isFinite(n)?n.toLocaleString(undefined,{maximumFractionDigits:d}):'-';};
  const P=v=>String(v).padStart(2,'0');
  const qty=d=>Math.max(1,Number(d?.project?.inverter_qty||d?.inverter_qty||1));
  function model(d){const inv=d?.inverter||{},p=d?.project||{};return ((inv.manufacturer||'')+' '+(inv.model||p.inverter_model||'INVERTER')).trim();}
  function is150(d){return model(d).toUpperCase().includes('SUN2000-150K-MG0');}

  function finalStrings(d){
    if(window.SolarBOQWarningFix54?.clean){try{window.SolarBOQWarningFix54.clean(d);}catch(_e){}}
    if(window.SolarBOQTerminal43?.applyPlan){try{window.SolarBOQTerminal43.applyPlan(d);}catch(_e){}}
    if(is150(d)&&window.SolarBOQTerminal53?.mappedStrings){
      try{
        const mapped=window.SolarBOQTerminal53.mappedStrings(d,1);
        if(mapped?.some(s=>s.pv_terminal))return mapped;
      }catch(_e){}
    }
    return (d?.strings||[]).map(s=>({...s,pv_terminal:s.terminal||s.pv_terminal||null}));
  }

  function groups(d,strings){
    const inv=d?.inverter||{},m=Math.max(1,Number(inv.num_mppt||d?.num_mppt||1)),ipm=Math.max(1,Number(inv.inputs_per_mppt||d?.inputs_per_mppt||1));
    return Array.from({length:m},(_,i)=>{
      const n=i+1,a=strings.filter(s=>Number(s.mppt)===n).sort((x,y)=>Number(x.input_no)-Number(y.input_no)||Number(x.string_no)-Number(y.string_no));
      return {mppt:n,strings:a,used:a.length,capacity:ipm};
    });
  }

  function terminalLabel(s){return s.pv_terminal||s.terminal||(`IN${F(s.input_no)}`);}

  function single55(d){
    const inv=d?.inverter||{},p=d?.project||{},strings=finalStrings(d),gs=groups(d,strings);
    const cable=window.SolarBOQCable45?.calculate?window.SolarBOQCable45.calculate(d):null;
    const cols=Math.min(4,Math.max(2,gs.length)),gapX=20,margin=46,cardW=330;
    const inputs=Math.max(1,Number(inv.inputs_per_mppt||d?.inputs_per_mppt||1));
    const cardH=Math.max(132,62+inputs*36),rows=Math.ceil(gs.length/cols),rowGap=88;
    const invW=580,invH=145,W=Math.max(1500,margin*2+cols*cardW+(cols-1)*gapX),invX=(W-invW)/2,invY=92;
    const firstRowY=330,rowPitch=cardH+rowGap,H=firstRowY+rows*rowPitch+40;
    let s=`<svg id="stringSvg" class="engineering-svg sld55" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
      <style>
        text{font-family:Segoe UI,Arial,sans-serif}.t55{fill:#0a3768;font-size:29px;font-weight:800}.sub55{fill:#70879a;font-size:14px}
        .invT55{fill:#0c4078;font-size:24px;font-weight:900}.invM55{fill:#365d7e;font-size:13px;font-weight:700}.invD55{fill:#617c92;font-size:13px}.invC55{fill:#0876d3;font-size:13px;font-weight:800}
        .mpT55{fill:#0b4d91;font-size:17px;font-weight:900}.cnt55{fill:#d77c00;font-size:14px;font-weight:900}.str55{fill:#234e73;font-size:14px;font-weight:800}.pv55{fill:#0a6fc2;font-size:13px;font-weight:900}.sp55{fill:#98acbc;font-size:13px;font-weight:700}
        .main55{stroke:#1976d2;stroke-width:2.8;fill:none}.drop55{stroke:#71a9da;stroke-width:1.8;fill:none}.node55{fill:#1976d2;stroke:#fff;stroke-width:2}
      </style>
      <rect width="${W}" height="${H}" fill="#f8fbff"/>
      <text x="${W/2}" y="42" text-anchor="middle" class="t55">INV-01 String Arrangement</text>
      <text x="${W/2}" y="66" text-anchor="middle" class="sub55">${E(p.name||'Solar Project')} · MPPT / String / Panel / PV Terminal</text>
      <rect x="${invX}" y="${invY}" width="${invW}" height="${invH}" rx="16" fill="#fff" stroke="#7fb5e7" stroke-width="2"/>
      <circle cx="${invX+38}" cy="${invY+36}" r="20" fill="#1976d2"/><text x="${invX+38}" y="${invY+43}" text-anchor="middle" fill="#fff" font-size="15" font-weight="800">1</text>
      <text x="${invX+74}" y="${invY+44}" class="invT55">INV-01</text>
      <text x="${invX+28}" y="${invY+78}" class="invM55">${E(model(d))}</text>
      <text x="${invX+28}" y="${invY+106}" class="invD55">${strings.length} Strings · ${F(inv.num_mppt||d?.num_mppt)} MPPT</text>
      ${cable?.supported?`<text x="${invX+28}" y="${invY+132}" class="invC55">MCCB ${F(cable.breakerA)} A · ${E(cable.cableLabel)}</text>`:''}`;

    const center=W/2,topBusY=285;
    s+=`<path d="M${center} ${invY+invH} V${topBusY}" class="main55"/>`;
    for(let r=0;r<rows;r++){
      const start=r*cols,end=Math.min(gs.length,start+cols),count=end-start,rowY=firstRowY+r*rowPitch,busY=rowY-34;
      const xFirst=margin+cardW/2,xLast=margin+(count-1)*(cardW+gapX)+cardW/2;
      if(r===0)s+=`<path d="M${center} ${topBusY} V${busY}" class="main55"/>`;
      else{const gutterX=margin-18;s+=`<path d="M${center} ${topBusY} H${gutterX} V${busY} H${xFirst}" class="main55"/>`;}
      s+=`<path d="M${xFirst} ${busY} H${xLast}" class="main55"/>`;
      for(let j=start;j<end;j++){
        const c=j-start,g=gs[j],x=margin+c*(cardW+gapX),cx=x+cardW/2,y=rowY;
        s+=`<path d="M${cx} ${busY} V${y-7}" class="drop55"/><circle cx="${cx}" cy="${y-5}" r="5" class="node55"/>
          <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="12" fill="#fff" stroke="#b7d7f4"/>
          <rect x="${x}" y="${y}" width="${cardW}" height="42" rx="12" fill="#eaf5ff"/>
          <text x="${x+15}" y="${y+28}" class="mpT55">MPPT${g.mppt}</text><text x="${x+cardW-15}" y="${y+28}" text-anchor="end" class="cnt55">${g.used}/${g.capacity}</text>`;
        if(!g.strings.length)s+=`<text x="${x+18}" y="${y+82}" class="sp55">SPARE</text>`;
        g.strings.forEach((st,k)=>{
          const yy=y+76+k*36,label=terminalLabel(st);
          s+=`<circle cx="${x+18}" cy="${yy-5}" r="4" class="node55"/><path d="M${x+22} ${yy-5} H${x+38}" class="drop55"/>
            <text x="${x+48}" y="${yy}" class="str55">S${P(st.string_no)} → ${F(st.modules)} Panels</text>
            <text x="${x+cardW-18}" y="${yy}" text-anchor="end" class="pv55">${E(label)}</text>`;
        });
      }
    }
    return s+'</svg>';
  }

  const prev55=typeof diagramSvg==='function'?diagramSvg:null;
  if(prev55){diagramSvg=function(d){if(qty(d)===1)return single55(d);return prev55(d);};}
  if(typeof document!=='undefined'&&!document.getElementById('uat55Style')){
    const st=document.createElement('style');st.id='uat55Style';st.textContent=`.sld55{width:100%;min-width:1450px;display:block;border-radius:14px;background:#f8fbff}#designOut{overflow-x:auto}.sld55 text{paint-order:stroke;stroke:rgba(255,255,255,.10);stroke-width:.2px}`;document.head.appendChild(st);
  }
  window.SolarBOQUnified55={singleSvg:single55,finalStrings};
})();