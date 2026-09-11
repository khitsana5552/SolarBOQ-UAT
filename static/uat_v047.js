// UAT v0.4.7 - Multi-inverter string allocation + multi-inverter SLD
// When the PR/project contains multiple identical inverter units, distribute all calculated
// strings across those inverter units instead of treating the project as one inverter.
(function(){
  function e47(v){return typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,'');}
  function f47(v,d=0){const n=Number(v||0);return Number.isFinite(n)?n.toLocaleString(undefined,{maximumFractionDigits:d}):'-';}
  function pad47(v){return String(v).padStart(2,'0');}
  function qty47(d){return Math.max(1,Number(d?.project?.inverter_qty||d?.inverter_qty||1));}

  function allocate47(d){
    if(!d)return d;
    const qty=qty47(d), inv=d.inverter||{};
    const mppt=Math.max(0,Number(inv.num_mppt||d.num_mppt||0));
    const inputs=Math.max(1,Number(inv.inputs_per_mppt||d.inputs_per_mppt||1));
    const strings=(d.strings||[]).slice().sort((a,b)=>(Number(b.modules||0)-Number(a.modules||0))||(Number(a.string_no)-Number(b.string_no)));
    d.inverter_qty=qty;
    if(qty<=1||mppt<=0)return d;

    const capPer=mppt*inputs,totalCap=capPer*qty;
    const invBuckets=Array.from({length:qty},()=>[]);
    strings.forEach(s=>{s.inverter_no=null;s.mppt=null;s.input_no=null;});
    for(const s of strings){
      const candidates=invBuckets.map((b,i)=>({b,i})).filter(x=>x.b.length<capPer);
      if(!candidates.length)break;
      candidates.sort((a,b)=>a.b.length-b.b.length || a.b.reduce((q,x)=>q+Number(x.modules||0),0)-b.b.reduce((q,x)=>q+Number(x.modules||0),0) || a.i-b.i);
      candidates[0].b.push(s);
    }
    invBuckets.forEach((bucket,invIdx)=>{
      const mppts=Array.from({length:mppt},()=>[]);
      bucket.slice().sort((a,b)=>(Number(b.modules||0)-Number(a.modules||0))||Number(a.string_no)-Number(b.string_no)).forEach(s=>{
        const candidates=mppts.map((b,i)=>({b,i})).filter(x=>x.b.length<inputs);
        if(!candidates.length)return;
        candidates.sort((a,b)=>a.b.length-b.b.length || a.b.reduce((q,x)=>q+Number(x.modules||0),0)-b.b.reduce((q,x)=>q+Number(x.modules||0),0) || a.i-b.i);
        candidates[0].b.push(s);
      });
      mppts.forEach((bucket,mIdx)=>{
        bucket.sort((a,b)=>Number(a.string_no)-Number(b.string_no)).forEach((s,inputIdx)=>{
          s.inverter_no=invIdx+1;s.mppt=mIdx+1;s.input_no=inputIdx+1;
        });
      });
    });

    d.warnings=(Array.isArray(d.warnings)?d.warnings:[]).filter(w=>{
      const t=String(w||'');
      return !/Calculated \d+ strings but the stored inverter input capacity is/i.test(t) &&
             !/Overflow strings remain unassigned/i.test(t) &&
             !/^MPPT\d+ contains strings/i.test(t);
    });
    if(strings.length>totalCap)d.warnings.push(`Calculated ${strings.length} strings but total capacity is ${totalCap} (${qty} inverter(s) × ${mppt} MPPT × ${inputs} input/MPPT). Overflow strings remain unassigned.`);

    const rebuild=(name,field,limitField)=>{
      if(!Array.isArray(d.checks))d.checks=[];
      d.checks=d.checks.filter(x=>String(x.name)!==name);
      const moduleA=Number(d[field]||0),limit=Number(inv[limitField]||0);
      if(!moduleA||!limit){d.checks.push({name,status:'N/A',value:`Need module ${field.toUpperCase()} + inverter limit/MPPT`});return;}
      let fail=false;const details=[];
      for(let i=1;i<=qty;i++)for(let m=1;m<=mppt;m++){
        const count=strings.filter(s=>Number(s.inverter_no)===i&&Number(s.mppt)===m).length;
        if(!count)continue;const a=count*moduleA;fail=fail||a>limit;details.push(`INV${i}-MPPT${m} ${a.toFixed(2)}A`);
      }
      d.checks.push({name,status:fail?'FAIL':'PASS',value:`${details.join(', ')}; limit ${limit.toFixed(2)}A/MPPT`});
    };
    rebuild('MPPT input current','imp','max_current_mppt');
    rebuild('MPPT short-circuit current','isc','max_isc_mppt');

    const unassigned=strings.filter(s=>!s.inverter_no);
    if(unassigned.length)d.warnings.push(`${unassigned.length} string(s) could not be assigned to an inverter input.`);
    return d;
  }

  function groups47(d,invNo){
    const inv=d.inverter||{},mppt=Math.max(1,Number(inv.num_mppt||d.num_mppt||1)),inputs=Math.max(1,Number(inv.inputs_per_mppt||d.inputs_per_mppt||1));
    const all=(d.strings||[]).filter(s=>Number(s.inverter_no||1)===invNo);
    return Array.from({length:mppt},(_,i)=>{
      const m=i+1,ss=all.filter(s=>Number(s.mppt)===m).sort((a,b)=>Number(a.input_no)-Number(b.input_no));
      return {mppt:m,strings:ss,used:ss.length,capacity:inputs};
    });
  }

  function multiSvg47(d){
    allocate47(d);
    const qty=qty47(d),inv=d.inverter||{},module=d.module||{},model=((inv.manufacturer||'')+' '+(inv.model||d?.project?.inverter_model||'INVERTER')).trim();
    const cable=window.SolarBOQCable45?.calculate?window.SolarBOQCable45.calculate(d):null;
    const mdb=window.SolarBOQMDB46?.calculate?window.SolarBOQMDB46.calculate(d):null;
    const W=1920,margin=48,sectionH=300,top=104,H=top+qty*sectionH+(mdb?.required?190:70);
    const leftW=285,gap=20,rightX=margin+leftW+gap,rightW=W-rightX-margin;
    const mpptCount=Math.max(1,Number(inv.num_mppt||d.num_mppt||1));
    const cols=Math.min(mpptCount,7),cardGap=10,cardW=(rightW-cardGap*(cols-1))/cols;
    let s=`<svg id="stringSvg" class="engineering-svg multi47" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
      <style>text{font-family:Segoe UI,Arial,sans-serif}.t47{fill:#f5f8fa;font-size:28px;font-weight:800}.sub47{fill:#9db5c2;font-size:14px}.inv47{fill:#fff;font-size:18px;font-weight:800}.meta47{fill:#a9c0cc;font-size:12px}.mp47{fill:#fff;font-size:14px;font-weight:800}.cap47{fill:#f0b34d;font-size:11px;font-weight:800}.str47{fill:#e9f1f5;font-size:10.5px}.mut47{fill:#839daa;font-size:10px}.wire47{stroke:#7fa9bc;stroke-width:2.2;fill:none}.bus47{stroke:#e6a438;stroke-width:2.8;fill:none}.mdb47{fill:#fff;font-size:18px;font-weight:800}.mdbv47{fill:#f0b34d;font-size:16px;font-weight:800}</style>
      <rect width="${W}" height="${H}" fill="#0b1821"/><text x="${margin}" y="38" class="t47">${e47(d?.project?.name||'Solar Project')}</text>
      <text x="${margin}" y="65" class="sub47">${e47(module.model||'Module')} • ${f47(d.total_modules)} Panels • ${f47(d.number_of_strings)} Strings • ${qty} Inverters • Multi-inverter allocation</text>`;

    for(let i=1;i<=qty;i++){
      const y=top+(i-1)*sectionH, groups=groups47(d,i),invStrings=(d.strings||[]).filter(x=>Number(x.inverter_no)===i);
      s+=`<rect x="${margin}" y="${y}" width="${leftW}" height="112" rx="12" fill="#15384d" stroke="#6f98ab"/>
        <text x="${margin+18}" y="${y+31}" class="inv47">INV-${pad47(i)}</text><text x="${margin+18}" y="${y+55}" class="meta47">${e47(model)}</text>
        <text x="${margin+18}" y="${y+79}" class="meta47">${invStrings.length} Strings • ${mpptCount} MPPT</text>
        ${cable?.supported?`<text x="${margin+18}" y="${y+101}" class="cap47">MCCB ${f47(cable.breakerA)} A • ${e47(cable.cableLabel)}</text>`:''}
        <path d="M${margin+leftW} ${y+56} H${rightX-8}" class="bus47"/>`;

      groups.forEach((g,j)=>{
        const row=Math.floor(j/cols),col=j%cols,x=rightX+col*(cardW+cardGap),cy=y+row*132;
        s+=`<rect x="${x}" y="${cy}" width="${cardW}" height="118" rx="9" fill="#102733" stroke="#456b7c"/>
          <rect x="${x}" y="${cy}" width="${cardW}" height="31" rx="9" fill="#17455e"/><text x="${x+10}" y="${cy+21}" class="mp47">MPPT${g.mppt}</text>
          <text x="${x+cardW-10}" y="${cy+21}" text-anchor="end" class="cap47">${g.used}/${g.capacity}</text>`;
        if(!g.strings.length)s+=`<text x="${x+10}" y="${cy+55}" class="mut47">SPARE</text>`;
        g.strings.forEach((st,k)=>{
          const yy=cy+52+k*23;
          s+=`<text x="${x+10}" y="${yy}" class="str47">S${pad47(st.string_no)} • ${f47(st.modules)}P • IN${f47(st.input_no)}</text>`;
        });
        s+=`<path d="M${rightX-8} ${y+56} H${x}" class="wire47"/>`;
      });
      const endY=y+sectionH-24;
      s+=`<path d="M${margin+leftW/2} ${y+112} V${endY}" class="wire47"/><circle cx="${margin+leftW/2}" cy="${endY}" r="4" fill="#e6a438"/>`;
    }

    if(mdb?.required&&mdb.status==='PASS'){
      const y=top+qty*sectionH+18,x=625,w=670,h=125;
      for(let i=1;i<=qty;i++){
        const fromY=top+(i-1)*sectionH+sectionH-24;
        s+=`<path d="M${margin+leftW/2} ${fromY} H${x-32} V${y+25+(i-1)*(Math.min(55,70/Math.max(1,qty-1)))} H${x}" class="bus47"/>`;
      }
      s+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="13" fill="#142b37" stroke="#b88a33" stroke-width="1.8"/>
        <text x="${x+22}" y="${y+32}" class="mdb47">MDB SOLAR</text><text x="${x+w-22}" y="${y+32}" text-anchor="end" class="meta47">MA ISOLATION / AC COLLECTION</text>
        <text x="${x+22}" y="${y+68}" class="meta47">INVERTER INCOMERS</text><text x="${x+205}" y="${y+68}" class="mdbv47">${qty} × MCCB ${f47(mdb.feederBreakerA)} A</text>
        <text x="${x+22}" y="${y+101}" class="meta47">MAIN BREAKER</text><text x="${x+205}" y="${y+101}" class="mdbv47">MCCB ${f47(mdb.mainBreakerA)} A</text>
        <path d="M${x+w} ${y+h/2} H${W-margin}" class="bus47"/><text x="${W-margin}" y="${y+h/2-10}" text-anchor="end" class="meta47">TO MAIN MDB / PCC</text>`;
    }
    return s+'</svg>';
  }

  const previousDiagram47=typeof diagramSvg==='function'?diagramSvg:null;
  if(previousDiagram47){diagramSvg=function(d){allocate47(d);return qty47(d)>1?multiSvg47(d):previousDiagram47(d);};}

  const previousRender47=typeof renderDesign==='function'?renderDesign:null;
  if(previousRender47){
    renderDesign=function(){
      if(state?.design)allocate47(state.design);
      previousRender47();
      if(typeof document==='undefined'||!state?.design||qty47(state.design)<=1)return;
      const out=document.getElementById('designOut');if(!out)return;
      const oldCapacity=document.getElementById('mpptCapacity44');if(oldCapacity)oldCapacity.remove();
      const old=document.getElementById('multiInv47');if(old)old.remove();
      const qty=qty47(state.design),inv=state.design.inverter||{},cap=Math.max(1,Number(inv.num_mppt||0))*Math.max(1,Number(inv.inputs_per_mppt||1));
      const rows=Array.from({length:qty},(_,i)=>{
        const ss=(state.design.strings||[]).filter(s=>Number(s.inverter_no)===i+1).sort((a,b)=>Number(a.string_no)-Number(b.string_no));
        return `<div><b>INV-${pad47(i+1)}</b><span>${ss.length} / ${cap} strings</span><small>${ss.length?`S${pad47(ss[0].string_no)}–S${pad47(ss[ss.length-1].string_no)}`:'No strings'}</small></div>`;
      }).join('');
      const wrap=document.createElement('div');wrap.id='multiInv47';wrap.className='card multi-card47';wrap.innerHTML=`<div class="row"><div><h2 style="margin:0">Inverter / String Allocation</h2><small>กระจาย String อัตโนมัติตามจำนวน Inverter ใน Project / PR</small></div><span class="badge ok">${qty} Inverters</span></div><div class="multi-grid47">${rows}</div>`;
      const cable=document.getElementById('cableAuto45');
      if(cable&&cable.nextSibling)out.insertBefore(wrap,cable.nextSibling);else out.insertBefore(wrap,out.firstChild);
    };
  }

  if(typeof document!=='undefined'&&!document.getElementById('uat47Style')){
    const st=document.createElement('style');st.id='uat47Style';st.textContent=`.multi47{width:100%;display:block;border-radius:14px;background:#0b1821}.multi-card47{border-top:4px solid #447f9b}.multi-grid47{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin-top:14px}.multi-grid47>div{padding:12px 14px;border:1px solid #dae4e9;border-radius:10px;background:#f8fafb}.multi-grid47 b{display:block;color:#17394b;font-size:16px}.multi-grid47 span{display:block;color:#b37a19;font-weight:800;margin-top:4px}.multi-grid47 small{display:block;color:#748994;margin-top:4px}`;document.head.appendChild(st);
  }

  window.SolarBOQMulti47={allocate:allocate47,groups:groups47};
})();
