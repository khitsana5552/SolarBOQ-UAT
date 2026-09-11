// UAT v0.4.9 - Top-down SLD: Factory MAIN MDB -> MDB SOLAR -> Inverters -> MPPT -> Strings/Panels
(function(){
  const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const F=(v,d=0)=>{const n=Number(v||0);return Number.isFinite(n)?n.toLocaleString(undefined,{maximumFractionDigits:d}):'-'};
  const P=v=>String(v).padStart(2,'0');
  const qty=d=>Math.max(1,Number(d?.project?.inverter_qty||d?.inverter_qty||1));

  function prep(d){
    if(window.SolarBOQMulti47?.allocate){try{window.SolarBOQMulti47.allocate(d)}catch(_e){}}
    return d;
  }
  function groups(d,invNo){
    if(window.SolarBOQMulti47?.groups){try{return window.SolarBOQMulti47.groups(d,invNo)}catch(_e){}}
    const inv=d?.inverter||{},m=Math.max(1,Number(inv.num_mppt||d?.num_mppt||1)),ipm=Math.max(1,Number(inv.inputs_per_mppt||d?.inputs_per_mppt||1));
    const ss=(d?.strings||[]).filter(s=>Number(s.inverter_no||1)===invNo);
    return Array.from({length:m},(_,i)=>{const n=i+1,a=ss.filter(s=>Number(s.mppt)===n).sort((x,y)=>Number(x.input_no)-Number(y.input_no));return {mppt:n,strings:a,used:a.length,capacity:ipm}});
  }
  function panelGlyph(x,y){return `<g opacity=".9"><rect x="${x}" y="${y}" width="28" height="18" rx="2" fill="#176ec5"/><path d="M${x+7} ${y+2}V${y+16}M${x+14} ${y+2}V${y+16}M${x+21} ${y+2}V${y+16}M${x+2} ${y+9}H${x+26}" stroke="#d9efff" stroke-width="1"/></g>`}

  function build49(d){
    prep(d);
    const q=qty(d), inv=d?.inverter||{}, p=d?.project||{}, model=((inv.manufacturer||'')+' '+(inv.model||p.inverter_model||'INVERTER')).trim();
    const cable=window.SolarBOQCable45?.calculate?window.SolarBOQCable45.calculate(d):null;
    const mdb=window.SolarBOQMDB46?.calculate?window.SolarBOQMDB46.calculate(d):null;
    const branchW=520,gap=28,margin=36,W=Math.max(1500,margin*2+q*branchW+(q-1)*gap);
    const topY=34,mainW=500,mainH=88,mdbW=650,mdbH=116;
    const mainX=(W-mainW)/2,mdbX=(W-mdbW)/2,mdbY=160;
    const invY=360,invH=138;
    const mpptTop=560,mpptCols=2,mpptGap=12,mpptCardW=(branchW-mpptGap)/2,mpptCardH=122;
    const mpptCount=Math.max(1,Number(inv.num_mppt||d?.num_mppt||1)),mpptRows=Math.ceil(mpptCount/mpptCols);
    const branchBottom=mpptTop+mpptRows*(mpptCardH+14)+18,H=Math.max(950,branchBottom+60);

    let s=`<svg id="stringSvg" class="engineering-svg sld49" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
    <defs><marker id="arrow49" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#1976d2"/></marker></defs>
    <style>
      text{font-family:Segoe UI,Arial,sans-serif}.ttl49{fill:#0b3b70;font-size:25px;font-weight:800}.sub49{fill:#607d96;font-size:13px}
      .boxTitle49{fill:#0b3f78;font-size:21px;font-weight:800}.boxSub49{fill:#5d7891;font-size:13px}.strong49{fill:#096fc9;font-size:15px;font-weight:800}
      .inv49{fill:#0b3f78;font-size:19px;font-weight:800}.invModel49{fill:#385d7d;font-size:12px;font-weight:700}.invMeta49{fill:#5d7790;font-size:12px}.invCable49{fill:#0b77d2;font-size:12px;font-weight:800}
      .mppt49{fill:#0b4f98;font-size:14px;font-weight:800}.count49{fill:#d77800;font-size:12px;font-weight:800}.string49{fill:#234d72;font-size:12.5px;font-weight:700}.spare49{fill:#94a8b9;font-size:12px;font-weight:700}
      .wire49{stroke:#1976d2;stroke-width:2.6;fill:none}.wireThin49{stroke:#66a6df;stroke-width:1.8;fill:none}.bus49{stroke:#0d6ec5;stroke-width:3.2;fill:none}.node49{fill:#1976d2;stroke:#fff;stroke-width:2}
    </style>
    <rect width="${W}" height="${H}" fill="#f8fbff"/>
    <text x="${margin}" y="28" class="ttl49">Single Line Diagram</text><text x="${margin+235}" y="28" class="sub49">${E(p.name||'Solar Project')} • ${F(d?.number_of_strings)} Strings • ${q} Inverter${q>1?'s':''}</text>

    <rect x="${mainX}" y="${topY}" width="${mainW}" height="${mainH}" rx="14" fill="#ffffff" stroke="#7fb6e7" stroke-width="1.8"/>
    <text x="${W/2}" y="${topY+35}" text-anchor="middle" class="boxTitle49">MDB MAIN (FACTORY)</text>
    <text x="${W/2}" y="${topY+62}" text-anchor="middle" class="boxSub49">Existing Factory Main Distribution Board / PCC</text>
    <path d="M${W/2} ${topY+mainH} V${mdbY}" class="bus49" marker-end="url(#arrow49)"/>

    <rect x="${mdbX}" y="${mdbY}" width="${mdbW}" height="${mdbH}" rx="14" fill="#ffffff" stroke="#28a36a" stroke-width="2"/>
    <text x="${mdbX+24}" y="${mdbY+34}" class="boxTitle49">MDB SOLAR</text>
    <text x="${mdbX+24}" y="${mdbY+61}" class="boxSub49">MA Isolation / AC Collection</text>
    ${mdb?.required&&mdb.status==='PASS'?`<text x="${mdbX+300}" y="${mdbY+48}" class="strong49">${F(mdb.feederBreakerQty)} × MCCB ${F(mdb.feederBreakerA)} A</text><text x="${mdbX+300}" y="${mdbY+78}" class="strong49">MAIN MCCB ${F(mdb.mainBreakerA)} A</text>`:''}
    <path d="M${W/2} ${mdbY+mdbH} V${invY-54}" class="bus49"/>
    <path d="M${margin+branchW/2} ${invY-54} H${W-margin-branchW/2}" class="bus49"/>`;

    for(let i=1;i<=q;i++){
      const bx=margin+(i-1)*(branchW+gap),cx=bx+branchW/2;
      const invStrings=(d?.strings||[]).filter(st=>Number(st.inverter_no||1)===i).sort((a,b)=>Number(a.string_no)-Number(b.string_no));
      const gs=groups(d,i);
      s+=`<path d="M${cx} ${invY-54} V${invY}" class="bus49" marker-end="url(#arrow49)"/>
      <rect x="${bx+35}" y="${invY}" width="${branchW-70}" height="${invH}" rx="14" fill="#ffffff" stroke="#86b9e8" stroke-width="1.8"/>
      <circle cx="${bx+63}" cy="${invY+27}" r="17" fill="#1976d2"/><text x="${bx+63}" y="${invY+33}" text-anchor="middle" fill="#fff" font-size="13" font-weight="800">${i}</text>
      <text x="${bx+91}" y="${invY+33}" class="inv49">INV-${P(i)}</text>
      <text x="${bx+57}" y="${invY+63}" class="invModel49">${E(model)}</text>
      <text x="${bx+57}" y="${invY+87}" class="invMeta49">${invStrings.length} Strings • ${mpptCount} MPPT</text>
      ${cable?.supported?`<text x="${bx+57}" y="${invY+112}" class="invCable49">MCCB ${F(cable.breakerA)} A • ${E(cable.cableLabel)}</text>`:''}
      <path d="M${cx} ${invY+invH} V${mpptTop-28}" class="wire49"/>
      <path d="M${bx+mpptCardW/2} ${mpptTop-28} H${bx+branchW-mpptCardW/2}" class="wire49"/>`;

      gs.forEach((g,j)=>{
        const rr=Math.floor(j/mpptCols),cc=j%mpptCols,x=bx+cc*(mpptCardW+mpptGap),y=mpptTop+rr*(mpptCardH+14);
        const trunkX=cc===0?bx+mpptCardW/2:bx+branchW-mpptCardW/2;
        s+=`<g><path d="M${trunkX} ${mpptTop-28} V${y}" class="wireThin49"/>
        <rect x="${x}" y="${y}" width="${mpptCardW}" height="${mpptCardH}" rx="10" fill="#ffffff" stroke="#b8d8f5"/>
        <rect x="${x}" y="${y}" width="${mpptCardW}" height="34" rx="10" fill="#eaf5ff"/>
        <text x="${x+12}" y="${y+23}" class="mppt49">MPPT${g.mppt}</text><text x="${x+mpptCardW-12}" y="${y+23}" text-anchor="end" class="count49">${g.used}/${g.capacity}</text>`;
        if(!g.strings.length){s+=`<text x="${x+14}" y="${y+67}" class="spare49">SPARE</text>`}
        g.strings.forEach((st,k)=>{
          const yy=y+57+k*30;
          s+=`<path d="M${x+12} ${yy} H${x+30}" class="wireThin49"/><circle cx="${x+12}" cy="${yy}" r="3.5" class="node49"/>
          <text x="${x+38}" y="${yy+4}" class="string49">S${P(st.string_no)} → ${F(st.modules)} Panels → IN${F(st.input_no)}</text>${panelGlyph(x+mpptCardW-44,yy-10)}`;
        });
        s+=`</g>`;
      });
    }
    return s+`</svg>`;
  }

  const prev=typeof diagramSvg==='function'?diagramSvg:null;
  if(prev){diagramSvg=function(d){prep(d);return qty(d)>1?build49(d):prev(d)}}
  if(typeof document!=='undefined'&&!document.getElementById('uat49Style')){
    const st=document.createElement('style');st.id='uat49Style';st.textContent=`.sld49{width:100%;min-width:1450px;display:block;background:#f8fbff;border-radius:14px}#designOut{overflow-x:auto}.sld49 text{paint-order:stroke;stroke:rgba(255,255,255,.12);stroke-width:.2px}`;document.head.appendChild(st);
  }
  window.SolarBOQTopDown49={build:build49};
})();