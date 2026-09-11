// UAT v0.4.8 - Light, readable multi-inverter Single Line Diagram
// Redesign based on the selected visual concept: left engineering summary, large inverter cards,
// readable MPPT cards, clear AC collection bus and MDB SOLAR at the bottom.
(function(){
  function e48(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
  function f48(v,d=0){const n=Number(v||0);return Number.isFinite(n)?n.toLocaleString(undefined,{maximumFractionDigits:d}):'-';}
  function p48(v){return String(v).padStart(2,'0');}
  function qty48(d){return Math.max(1,Number(d?.project?.inverter_qty||d?.inverter_qty||1));}

  function prep48(d){
    if(window.SolarBOQMulti47?.allocate){try{window.SolarBOQMulti47.allocate(d);}catch(_e){}}
    return d;
  }

  function groups48(d,invNo){
    if(window.SolarBOQMulti47?.groups){
      try{return window.SolarBOQMulti47.groups(d,invNo);}catch(_e){}
    }
    const inv=d?.inverter||{};
    const mppt=Math.max(1,Number(inv.num_mppt||d?.num_mppt||1));
    const inputs=Math.max(1,Number(inv.inputs_per_mppt||d?.inputs_per_mppt||1));
    const all=(d?.strings||[]).filter(s=>Number(s.inverter_no||1)===invNo);
    return Array.from({length:mppt},(_,i)=>{
      const n=i+1,strings=all.filter(s=>Number(s.mppt)===n).sort((a,b)=>Number(a.input_no)-Number(b.input_no));
      return {mppt:n,strings,used:strings.length,capacity:inputs};
    });
  }

  function summaryRows48(d,cable,mdb){
    const p=d?.project||{},inv=d?.inverter||{},mod=d?.module||{};
    const rows1=[
      ['Project',p.name||'Solar Project'],
      ['Module',mod.model||p.module_model||'-'],
      ['PV Panels',`${f48(d?.total_modules||p.module_qty)} pcs`],
      ['Total Strings',`${f48(d?.number_of_strings)} strings`],
      ['Inverters',`${qty48(d)} units`],
      ['System AC',`${f48(p.ac_kw||((inv.rated_ac_kw||0)*qty48(d)),1)} kW`]
    ];
    const rows2=[
      ['Model',inv.model||p.inverter_model||'-'],
      ['MPPT / Inverter',f48(inv.num_mppt||d?.num_mppt)],
      ['Inputs / MPPT',f48(inv.inputs_per_mppt||d?.inputs_per_mppt)],
      ['Inverter MCCB',cable?.supported?`${f48(cable.breakerA)} A`:'Review'],
      ['AC Cable',cable?.supported?cable.cableLabel:'Review']
    ];
    const rows3=mdb?.required&&mdb?.status==='PASS' ? [
      ['MDB Name','MDB SOLAR'],
      ['Incomers',`${f48(mdb.feederBreakerQty)} × MCCB ${f48(mdb.feederBreakerA)} A`],
      ['Main Breaker',`MCCB ${f48(mdb.mainBreakerA)} A`],
      ['Outgoing','To MAIN MDB / PCC']
    ] : [];
    return {rows1,rows2,rows3};
  }

  function sideSection48(x,y,w,title,rows,accent='#1687e8'){
    if(!rows.length)return '';
    const rowH=28,pad=16,headH=42,h=headH+pad+rows.length*rowH+8;
    let s=`<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#ffffff" stroke="#d8e6f5"/>
      <rect x="${x}" y="${y}" width="${w}" height="${headH}" rx="12" fill="#f2f8ff"/>
      <rect x="${x+12}" y="${y+10}" width="22" height="22" rx="6" fill="${accent}" opacity=".12"/>
      <circle cx="${x+23}" cy="${y+21}" r="5" fill="${accent}"/>
      <text x="${x+44}" y="${y+27}" class="sideTitle48">${e48(title)}</text>`;
    rows.forEach((r,i)=>{
      const yy=y+headH+pad+i*rowH;
      s+=`<text x="${x+16}" y="${yy+14}" class="sideKey48">${e48(r[0])}</text>
          <text x="${x+w-16}" y="${yy+14}" text-anchor="end" class="sideVal48">${e48(r[1])}</text>`;
    });
    return s+'</g>';
  }

  function inverterCard48(x,y,w,h,no,model,stringCount,mpptCount,cable){
    const iconX=x+18,iconY=y+48;
    return `<g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="#ffffff" stroke="#a9cff5" stroke-width="1.5"/>
      <circle cx="${x+22}" cy="${y+24}" r="15" fill="#0e7fe5"/>
      <text x="${x+22}" y="${y+30}" text-anchor="middle" class="num48">${no}</text>
      <text x="${x+48}" y="${y+30}" class="invTitle48">INV-${p48(no)}</text>
      <rect x="${iconX}" y="${iconY}" width="82" height="66" rx="9" fill="#eef3f7" stroke="#c3d3df"/>
      <rect x="${iconX+18}" y="${iconY+14}" width="46" height="38" rx="5" fill="#d7e0e7" stroke="#97aab8"/>
      <text x="${iconX+41}" y="${iconY+38}" text-anchor="middle" class="iconText48">DC/AC</text>
      <text x="${x+116}" y="${y+64}" class="invModel48">${e48(model)}</text>
      <text x="${x+116}" y="${y+90}" class="invMeta48">${f48(stringCount)} Strings • ${f48(mpptCount)} MPPT</text>
      ${cable?.supported?`<text x="${x+116}" y="${y+118}" class="invCable48">MCCB ${f48(cable.breakerA)} A</text>
      <text x="${x+116}" y="${y+143}" class="invCable48">${e48(cable.cableLabel)}</text>`:''}
    </g>`;
  }

  function mpptCard48(x,y,w,h,g){
    const headH=38;
    let s=`<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#ffffff" stroke="#b9d8f7"/>
      <rect x="${x}" y="${y}" width="${w}" height="${headH}" rx="10" fill="#eaf5ff"/>
      <text x="${x+12}" y="${y+25}" class="mpptTitle48">MPPT${g.mppt}</text>
      <rect x="${x+w-52}" y="${y+8}" width="40" height="24" rx="8" fill="${g.used>=g.capacity?'#fff1d6':'#dff5e8'}"/>
      <text x="${x+w-32}" y="${y+25}" text-anchor="middle" class="count48">${g.used}/${g.capacity}</text>`;
    if(!g.strings.length){
      s+=`<text x="${x+12}" y="${y+67}" class="spare48">SPARE</text>`;
    } else {
      g.strings.forEach((st,i)=>{
        const yy=y+64+i*27;
        s+=`<rect x="${x+9}" y="${yy-17}" width="${w-18}" height="23" rx="7" fill="#f8fbfe" stroke="#e1edf8"/>
          <text x="${x+16}" y="${yy}" class="string48">S${p48(st.string_no)} • ${f48(st.modules)}P • IN${f48(st.input_no)}</text>`;
      });
    }
    return s+'</g>';
  }

  function diagram48(d){
    prep48(d);
    const qty=qty48(d),p=d?.project||{},inv=d?.inverter||{},mod=d?.module||{};
    const cable=window.SolarBOQCable45?.calculate?window.SolarBOQCable45.calculate(d):null;
    const mdb=window.SolarBOQMDB46?.calculate?window.SolarBOQMDB46.calculate(d):null;
    const model=((inv.manufacturer||'')+' '+(inv.model||p.inverter_model||'INVERTER')).trim();
    const mpptCount=Math.max(1,Number(inv.num_mppt||d?.num_mppt||1));
    const inputs=Math.max(1,Number(inv.inputs_per_mppt||d?.inputs_per_mppt||1));
    const cols=mpptCount<=7?mpptCount:Math.min(5,mpptCount);
    const rows=Math.ceil(mpptCount/cols);

    const W=1920,sideW=330,margin=24,mainX=sideW+44,mainRight=W-26;
    const invW=300,gap=18,mpptX=mainX+invW+26,mpptAreaW=mainRight-mpptX;
    const cardGap=10,cardW=(mpptAreaW-cardGap*(cols-1))/cols;
    const cardH=Math.max(112,50+inputs*28);
    const rowH=Math.max(210,rows*(cardH+16)+30);
    const top=88,mdbH=mdb?.required?160:80;
    const H=Math.max(840,top+qty*rowH+mdbH+40);

    const sums=summaryRows48(d,cable,mdb);
    let s=`<svg id="stringSvg" class="engineering-svg sld48" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
      <style>
        text{font-family:Segoe UI,Arial,sans-serif}.pageTitle48{fill:#0b2f5b;font-size:26px;font-weight:800}.pageSub48{fill:#657f9b;font-size:15px}
        .sideTitle48{fill:#0d65b5;font-size:16px;font-weight:800}.sideKey48{fill:#64788c;font-size:12px}.sideVal48{fill:#173b61;font-size:12px;font-weight:700}
        .num48{fill:#fff;font-size:14px;font-weight:800}.invTitle48{fill:#0d3f78;font-size:21px;font-weight:800}.invModel48{fill:#274d73;font-size:13px;font-weight:700}
        .invMeta48{fill:#506f8d;font-size:14px}.invCable48{fill:#0878dc;font-size:13px;font-weight:800}.iconText48{fill:#63798b;font-size:10px;font-weight:800}
        .mpptTitle48{fill:#0b4f98;font-size:15px;font-weight:800}.count48{fill:#d77a00;font-size:13px;font-weight:800}.string48{fill:#24496d;font-size:13px;font-weight:700}.spare48{fill:#8aa0b4;font-size:13px;font-weight:700}
        .wire48{stroke:#1283eb;stroke-width:2.4;fill:none}.bus48{stroke:#0f78db;stroke-width:3;fill:none}.node48{fill:#0d83ea;stroke:#fff;stroke-width:2}
        .mdbTitle48{fill:#0b3e75;font-size:23px;font-weight:800}.mdbKey48{fill:#6a7f91;font-size:12px}.mdbVal48{fill:#0878dc;font-size:18px;font-weight:800}.out48{fill:#0a5eac;font-size:15px;font-weight:800}
      </style>
      <rect width="${W}" height="${H}" fill="#f7fbff"/>
      <rect x="0" y="0" width="${W}" height="64" fill="#ffffff" stroke="#dfeaf4"/>
      <text x="${mainX}" y="38" class="pageTitle48">Single Line Diagram</text>
      <text x="${mainX+245}" y="38" class="pageSub48">${e48(p.name||'Solar Project')} • ${f48(d?.number_of_strings)} Strings • ${qty} Inverter${qty>1?'s':''}</text>`;

    let sy=82;
    s+=sideSection48(14,sy,sideW-20,'Project Summary',sums.rows1);sy+=42+16+sums.rows1.length*28+24;
    s+=sideSection48(14,sy,sideW-20,'Inverter Summary',sums.rows2,'#0d83ea');sy+=42+16+sums.rows2.length*28+24;
    if(sums.rows3.length)s+=sideSection48(14,sy,sideW-20,'MDB Summary',sums.rows3,'#16a36a');

    const busX=mpptX-20;
    const mdbY=top+qty*rowH+10;
    for(let i=1;i<=qty;i++){
      const y=top+(i-1)*rowH;
      const gs=groups48(d,i);
      const invStrings=(d?.strings||[]).filter(st=>Number(st.inverter_no||1)===i);
      const invY=y+18,invH=160;
      s+=inverterCard48(mainX,invY,invW,invH,i,model,invStrings.length,mpptCount,cable);
      s+=`<path d="M${mainX+invW} ${invY+78} H${busX}" class="wire48"/><circle cx="${busX}" cy="${invY+78}" r="7" class="node48"/>`;
      gs.forEach((g,j)=>{
        const rr=Math.floor(j/cols),cc=j%cols,x=mpptX+cc*(cardW+cardGap),yy=y+12+rr*(cardH+16);
        s+=`<path d="M${busX} ${invY+78} V${yy-10} H${x+cardW/2} V${yy}" class="wire48"/>`;
        s+=mpptCard48(x,yy,cardW,cardH,g);
      });
      const outY=invY+136;
      s+=`<path d="M${mainX+invW/2} ${invY+invH} V${outY+45} H${mainX+invW+20} V${mdbY-18}" class="bus48"/>`;
    }

    if(mdb?.required&&mdb.status==='PASS'){
      const mx=mainX+430,mw=660,mh=128,my=mdbY;
      for(let i=1;i<=qty;i++){
        const y=top+(i-1)*rowH+18+160+45;
        s+=`<path d="M${mainX+invW+20} ${y} H${mx-22} V${my+30+(i-1)*Math.max(22,Math.min(34,70/Math.max(1,qty-1)))} H${mx}" class="bus48"/>`;
      }
      s+=`<rect x="${mx}" y="${my}" width="${mw}" height="${mh}" rx="14" fill="#ffffff" stroke="#78b4ee" stroke-width="1.8"/>
        <rect x="${mx+18}" y="${my+18}" width="74" height="88" rx="9" fill="#eef5fa" stroke="#d5e3ee"/>
        <rect x="${mx+37}" y="${my+34}" width="36" height="56" rx="5" fill="#41576a"/>
        <text x="${mx+116}" y="${my+38}" class="mdbTitle48">MDB SOLAR</text>
        <text x="${mx+116}" y="${my+67}" class="mdbKey48">INVERTER INCOMERS</text><text x="${mx+116}" y="${my+91}" class="mdbVal48">${qty} × MCCB ${f48(mdb.feederBreakerA)} A</text>
        <line x1="${mx+330}" y1="${my+48}" x2="${mx+330}" y2="${my+104}" stroke="#cdddea"/>
        <text x="${mx+360}" y="${my+67}" class="mdbKey48">MAIN BREAKER</text><text x="${mx+360}" y="${my+91}" class="mdbVal48">MCCB ${f48(mdb.mainBreakerA)} A</text>
        <text x="${mx+520}" y="${my+71}" class="mdbKey48">MA ISOLATION / AC COLLECTION</text>
        <path d="M${mx+mw} ${my+64} H${mainRight-14}" class="bus48"/>
        <path d="M${mainRight-14} ${my+64} l-14 -8 v16 z" fill="#0f78db"/>
        <text x="${mainRight-12}" y="${my+48}" text-anchor="end" class="out48">TO MAIN MDB / PCC</text>`;
    }
    return s+'</svg>';
  }

  const prevDiagram48=typeof diagramSvg==='function'?diagramSvg:null;
  if(prevDiagram48){
    diagramSvg=function(d){prep48(d);return qty48(d)>1?diagram48(d):prevDiagram48(d);};
  }

  if(typeof document!=='undefined'&&!document.getElementById('uat48Style')){
    const st=document.createElement('style');st.id='uat48Style';st.textContent=`
      .sld48{width:100%;min-width:1480px;height:auto;display:block;background:#f7fbff;border:1px solid #dce8f3;border-radius:14px}
      #designOut{overflow-x:auto}.multi-card47{border-top-color:#1687e8}
      @media(max-width:1200px){.sld48{min-width:1420px}}
    `;document.head.appendChild(st);
  }

  window.SolarBOQSLD48={render:diagram48,prepare:prep48};
})();