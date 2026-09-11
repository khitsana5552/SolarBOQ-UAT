// UAT v0.5.3 - SUN2000-150K-MG0 exact PV terminal mapping from Huawei terminal-selection table
(function(){
  const MAP150={
    8:[1,3,4,9,10,13,18,21],
    9:[1,3,4,9,10,13,18,19,21],
    10:[1,3,4,6,9,10,13,18,19,21],
    11:[1,3,4,6,9,10,13,16,18,19,21],
    12:[1,3,4,6,8,9,10,13,16,18,19,21],
    13:[1,3,4,6,8,9,10,13,15,16,18,19,21],
    14:[1,3,4,6,8,9,10,12,13,15,16,18,19,21],
    15:[1,2,3,4,6,8,9,10,12,13,15,16,18,19,21],
    16:[1,2,3,4,6,8,9,10,12,13,15,16,18,19,20,21],
    17:[1,2,3,4,5,6,8,9,10,12,13,15,16,18,19,20,21],
    18:[1,2,3,4,5,6,8,9,10,12,13,15,16,17,18,19,20,21],
    19:[1,2,3,4,5,6,8,9,10,12,13,14,15,16,17,18,19,20,21],
    20:[1,2,3,4,5,6,7,8,9,10,12,13,14,15,16,17,18,19,20,21]
  };
  const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const F=(v,d=0)=>{const n=Number(v||0);return Number.isFinite(n)?n.toLocaleString(undefined,{maximumFractionDigits:d}):'-';};
  const P=v=>String(v).padStart(2,'0');
  function is150(d){const s=((d?.inverter?.model||'')+' '+(d?.project?.inverter_model||'')).toUpperCase();return s.includes('SUN2000-150K-MG0');}
  function mappedStrings(d,invNo){
    const ss=(d?.strings||[]).filter(s=>Number(s.inverter_no||1)===invNo).sort((a,b)=>Number(a.string_no)-Number(b.string_no));
    const pv=MAP150[ss.length];
    if(!is150(d)||!pv)return ss.map(s=>({...s,pv_terminal:null}));
    return ss.map((s,i)=>({...s,pv_terminal:`PV${pv[i]}`,mppt:Math.ceil(pv[i]/3),input_no:((pv[i]-1)%3)+1}));
  }
  function groups53(d,invNo){
    const inputs=3,mppt=7,ss=mappedStrings(d,invNo);
    return Array.from({length:mppt},(_,i)=>{const n=i+1,a=ss.filter(s=>Number(s.mppt)===n).sort((x,y)=>Number(x.input_no)-Number(y.input_no));return {mppt:n,strings:a,used:a.length,capacity:inputs};});
  }
  function detail53(d,invNo){
    if(window.SolarBOQMulti47?.allocate){try{window.SolarBOQMulti47.allocate(d);}catch(_e){}}
    const p=d?.project||{},inv=d?.inverter||{},cable=window.SolarBOQCable45?.calculate?window.SolarBOQCable45.calculate(d):null;
    const ss=mappedStrings(d,invNo),gs=is150(d)&&MAP150[ss.length]?groups53(d,invNo):(window.SolarBOQMulti47?.groups?window.SolarBOQMulti47.groups(d,invNo):[]);
    const cols=Math.min(4,Math.max(2,gs.length)),gapX=20,margin=46,cardW=330,inputs=Math.max(1,Number(inv.inputs_per_mppt||d?.inputs_per_mppt||1));
    const cardH=Math.max(132,62+inputs*36),rows=Math.ceil(gs.length/cols),rowGap=88,invW=580,invH=145,W=Math.max(1500,margin*2+cols*cardW+(cols-1)*gapX),invX=(W-invW)/2,invY=112;
    const firstRowY=360,rowPitch=cardH+rowGap,H=firstRowY+rows*rowPitch+40,model=((inv.manufacturer||'')+' '+(inv.model||p.inverter_model||'INVERTER')).trim();
    let s=`<svg id="stringSvg" class="engineering-svg sld53 detail53" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><style>text{font-family:Segoe UI,Arial,sans-serif}.t53{fill:#0a3768;font-size:29px;font-weight:800}.sub53{fill:#70879a;font-size:14px}.back53{fill:#0e75cf;font-size:14px;font-weight:800}.invT53{fill:#0c4078;font-size:24px;font-weight:900}.invM53{fill:#365d7e;font-size:13px;font-weight:700}.invD53{fill:#617c92;font-size:13px}.invC53{fill:#0876d3;font-size:13px;font-weight:800}.mpT53{fill:#0b4d91;font-size:17px;font-weight:900}.cnt53{fill:#d77c00;font-size:14px;font-weight:900}.str53{fill:#234e73;font-size:14px;font-weight:800}.sp53{fill:#98acbc;font-size:13px;font-weight:700}.pv53{fill:#0a6fc2;font-size:12px;font-weight:900}.main53{stroke:#1976d2;stroke-width:2.8;fill:none}.drop53{stroke:#71a9da;stroke-width:1.8;fill:none}.node53{fill:#1976d2;stroke:#fff;stroke-width:2}</style><rect width="${W}" height="${H}" fill="#f8fbff"/><g class="back-overview50" style="cursor:pointer;pointer-events:all" onclick="window.SolarBOQParts50&&window.SolarBOQParts50.overview()"><rect x="${margin}" y="22" width="180" height="40" rx="10" fill="#fff" stroke="#9bc5ec"/><text x="${margin+18}" y="48" class="back53">← Back to Overview</text></g><text x="${W/2}" y="48" text-anchor="middle" class="t53">Part 2 · INV-${P(invNo)} String Arrangement</text><text x="${W/2}" y="73" text-anchor="middle" class="sub53">${E(p.name||'Solar Project')} · Huawei PV terminal mapping</text><rect x="${invX}" y="${invY}" width="${invW}" height="${invH}" rx="16" fill="#fff" stroke="#7fb5e7" stroke-width="2"/><circle cx="${invX+38}" cy="${invY+36}" r="20" fill="#1976d2"/><text x="${invX+38}" y="${invY+43}" text-anchor="middle" fill="#fff" font-size="15" font-weight="800">${invNo}</text><text x="${invX+74}" y="${invY+44}" class="invT53">INV-${P(invNo)}</text><text x="${invX+28}" y="${invY+78}" class="invM53">${E(model)}</text><text x="${invX+28}" y="${invY+106}" class="invD53">${ss.length} Strings · ${F(inv.num_mppt||d?.num_mppt)} MPPT</text>${cable?.supported?`<text x="${invX+28}" y="${invY+132}" class="invC53">MCCB ${F(cable.breakerA)} A · ${E(cable.cableLabel)}</text>`:''}`;
    const center=W/2,topBusY=315;s+=`<path d="M${center} ${invY+invH} V${topBusY}" class="main53"/>`;
    for(let r=0;r<rows;r++){
      const start=r*cols,end=Math.min(gs.length,start+cols),count=end-start,rowY=firstRowY+r*rowPitch,busY=rowY-34,xFirst=margin+cardW/2,xLast=margin+(count-1)*(cardW+gapX)+cardW/2;
      if(r===0)s+=`<path d="M${center} ${topBusY} V${busY}" class="main53"/>`;else{const gutterX=margin-18;s+=`<path d="M${center} ${topBusY} H${gutterX} V${busY} H${xFirst}" class="main53"/>`;}
      s+=`<path d="M${xFirst} ${busY} H${xLast}" class="main53"/>`;
      for(let j=start;j<end;j++){
        const c=j-start,g=gs[j],x=margin+c*(cardW+gapX),cx=x+cardW/2,y=rowY;s+=`<path d="M${cx} ${busY} V${y-7}" class="drop53"/><circle cx="${cx}" cy="${y-5}" r="5" class="node53"/><rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="12" fill="#fff" stroke="#b7d7f4"/><rect x="${x}" y="${y}" width="${cardW}" height="42" rx="12" fill="#eaf5ff"/><text x="${x+15}" y="${y+28}" class="mpT53">MPPT${g.mppt}</text><text x="${x+cardW-15}" y="${y+28}" text-anchor="end" class="cnt53">${g.used}/${g.capacity}</text>`;
        if(!g.strings.length)s+=`<text x="${x+18}" y="${y+82}" class="sp53">SPARE</text>`;
        g.strings.forEach((st,k)=>{const yy=y+76+k*36,label=st.pv_terminal||`IN${F(st.input_no)}`;s+=`<circle cx="${x+18}" cy="${yy-5}" r="4" class="node53"/><path d="M${x+22} ${yy-5} H${x+38}" class="drop53"/><text x="${x+48}" y="${yy}" class="str53">S${P(st.string_no)} → ${F(st.modules)} Panels</text><text x="${x+cardW-18}" y="${yy}" text-anchor="end" class="pv53">${E(label)}</text>`;});
      }
    }
    return s+'</svg>';
  }
  const prev=typeof diagramSvg==='function'?diagramSvg:null;
  if(prev){diagramSvg=function(d){const n=window.SolarBOQParts50?.getSelected?Number(window.SolarBOQParts50.getSelected()||0):0;if(n>0&&is150(d)&&MAP150[mappedStrings(d,n).length])return detail53(d,n);return prev(d);};}
  window.SolarBOQTerminal53={map150:MAP150,mappedStrings,groups:groups53,detailSvg:detail53};
})();
