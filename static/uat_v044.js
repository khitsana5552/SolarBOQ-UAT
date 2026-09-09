// UAT v0.4.4 - Engineering-style MPPT/String single-line diagram
// Purpose: make each MPPT show its physical string capacity, used strings, PV terminals,
// and vertical string branches similar to the user's AutoCAD reference.
(function(){
  function e44(v){return typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,'');}
  function f44(v,d=2){const n=Number(v||0);return Number.isFinite(n)?n.toLocaleString(undefined,{maximumFractionDigits:d}):'0';}
  function n44(v){return Math.max(0,Number(v||0));}
  function pad44(v){return String(v).padStart(2,'0');}

  function prep44(d){
    if(window.SolarBOQTerminal43?.applyPlan){
      try{window.SolarBOQTerminal43.applyPlan(d);}catch(_e){}
    }
    return d;
  }

  function mpptGroups44(d){
    const inv=d?.inverter||{};
    const strings=(d?.strings||[]).slice().sort((a,b)=>Number(a.string_no)-Number(b.string_no));
    const mpptCount=Math.max(1,n44(inv.num_mppt||d.num_mppt||0),...strings.map(s=>n44(s.mppt)));
    const defaultInputs=Math.max(1,n44(inv.inputs_per_mppt||d.inputs_per_mppt||1));
    const groups=[];
    for(let m=1;m<=mpptCount;m++){
      const assigned=strings.filter(s=>Number(s.mppt)===m).sort((a,b)=>(Number(a.input_no||99)-Number(b.input_no||99))||(Number(a.string_no)-Number(b.string_no)));
      const capacity=Math.max(defaultInputs,...assigned.map(s=>n44(s.input_no)),1);
      const slots=[];
      for(let input=1;input<=capacity;input++){
        const st=assigned.find(s=>Number(s.input_no)===input)||null;
        slots.push({input,string:st});
      }
      // Do not hide an assigned string if its input number was absent or duplicated.
      assigned.forEach(st=>{if(!slots.some(x=>x.string===st))slots.push({input:n44(st.input_no)||slots.length+1,string:st});});
      groups.push({mppt:m,capacity,assigned,slots,used:assigned.length,free:Math.max(0,capacity-assigned.length)});
    }
    return groups;
  }

  function moduleGlyph44(x,y){
    const parts=[];
    for(let i=0;i<3;i++){
      const yy=y+i*27;
      parts.push(`<rect x="${x-15}" y="${yy}" width="30" height="20" rx="2" fill="#0f2735" stroke="#9cb6c5" stroke-width="1.4"/>`);
      parts.push(`<path d="M${x-10} ${yy+6} H${x+10} M${x-10} ${yy+13} H${x+10}" stroke="#6f91a4" stroke-width="1"/>`);
    }
    return parts.join('');
  }

  function branch44(slot,cx,topY,slotW){
    const st=slot.string;
    const input=slot.input;
    const terminal=st?.terminal||`Input ${input}`;
    if(!st){
      return `<g opacity=".55">
        <circle cx="${cx}" cy="${topY}" r="4.5" fill="#0d1b25" stroke="#7d9aaa" stroke-width="1.5"/>
        <path d="M${cx} ${topY+5} V${topY+86}" stroke="#607d8d" stroke-width="1.5" stroke-dasharray="7 7"/>
        <rect x="${cx-slotW*0.38}" y="${topY+92}" width="${slotW*0.76}" height="38" rx="7" fill="#102430" stroke="#506b79" stroke-dasharray="5 4"/>
        <text x="${cx}" y="${topY+116}" text-anchor="middle" class="spare44">SPARE ${e44(terminal)}</text>
      </g>`;
    }
    const swY=topY+42, moduleY=topY+104;
    const line1=`${st.terminal?st.terminal:`INPUT ${input}`} • S${pad44(st.string_no)}`;
    const line2=`${f44(st.modules,0)} PANELS`;
    const line3=`Vmp ${f44(st.estimated_vmp,1)} V • Voc ${f44(st.estimated_voc,1)} V`;
    const switchLabel=st.dc_switch?String(st.dc_switch):'';
    return `<g>
      <circle cx="${cx}" cy="${topY}" r="5" fill="#f0a226"/>
      <path d="M${cx} ${topY+5} V${swY-12}" class="wire44"/>
      <circle cx="${cx-8}" cy="${swY}" r="3.4" fill="#0d1b25" stroke="#d3e1e8" stroke-width="1.4"/>
      <circle cx="${cx+8}" cy="${swY}" r="3.4" fill="#0d1b25" stroke="#d3e1e8" stroke-width="1.4"/>
      <path d="M${cx-5} ${swY-3} L${cx+6} ${swY-13}" stroke="#d3e1e8" stroke-width="1.7"/>
      <path d="M${cx} ${swY+4} V${moduleY-12}" class="wire44"/>
      ${moduleGlyph44(cx,moduleY)}
      <path d="M${cx} ${moduleY+77} V${moduleY+93}" class="wire44"/>
      <text x="${cx}" y="${moduleY+114}" text-anchor="middle" class="terminal44">${e44(line1)}</text>
      <text x="${cx}" y="${moduleY+137}" text-anchor="middle" class="string44">STRING-${pad44(st.string_no)} (${e44(line2)})</text>
      <text x="${cx}" y="${moduleY+158}" text-anchor="middle" class="elect44">${e44(line3)}</text>
      ${switchLabel?`<text x="${cx}" y="${moduleY+178}" text-anchor="middle" class="switch44">${e44(switchLabel)}</text>`:''}
    </g>`;
  }

  function rowDiagram44(groups,start,end,rowTop,W,margin,gap,groupW,rowNo){
    const subset=groups.slice(start,end), centers=[];
    subset.forEach((g,i)=>centers.push(margin+i*(groupW+gap)+groupW/2));
    if(!subset.length)return '';
    const busY=rowTop+42, boxY=rowTop+64, boxH=74, branchTop=boxY+boxH+18;
    let out=`<path d="M${centers[0]} ${busY} H${centers[centers.length-1]}" class="bus44"/>`;
    out+=`<circle cx="${W/2}" cy="${busY}" r="5" fill="#f0a226"/>`;
    subset.forEach((g,i)=>{
      const x=margin+i*(groupW+gap), cx=x+groupW/2;
      out+=`<path d="M${cx} ${busY} V${boxY}" class="bus44"/>`;
      out+=`<rect x="${x}" y="${boxY}" width="${groupW}" height="${boxH}" rx="8" fill="#0f202c" stroke="#8ca7b6" stroke-width="1.3"/>`;
      out+=`<rect x="${x}" y="${boxY}" width="${groupW}" height="34" rx="8" fill="#173f56"/>`;
      out+=`<text x="${x+14}" y="${boxY+23}" class="mppt44">MPPT${g.mppt}</text>`;
      out+=`<text x="${x+groupW-14}" y="${boxY+23}" text-anchor="end" class="cap44">${g.used}/${g.capacity} STRINGS</text>`;
      out+=`<text x="${cx}" y="${boxY+57}" text-anchor="middle" class="capdetail44">Capacity ${g.capacity} • Used ${g.used} • Spare ${g.free}</text>`;
      const slotW=groupW/g.capacity;
      g.slots.forEach((slot,j)=>{
        const sx=x+slotW*(j+.5);
        out+=`<path d="M${sx} ${boxY+boxH} V${branchTop}" class="wire44"/>`;
        out+=branch44(slot,sx,branchTop,slotW);
      });
    });
    return out;
  }

  diagramSvg=function(d){
    prep44(d);
    const inv=d?.inverter||{}, groups=mpptGroups44(d);
    const mpptCount=groups.length;
    const maxPerRow=mpptCount<=4?mpptCount:5;
    const rows=Math.ceil(mpptCount/maxPerRow);
    const W=1920, margin=55, gap=20;
    const groupW=(W-margin*2-gap*(maxPerRow-1))/maxPerRow;
    const rowH=430;
    const invY=102, invW=760, invH=92, invX=(W-invW)/2;
    const firstRowTop=232;
    const H=firstRowTop+rows*rowH+48;
    const totalCapacity=groups.reduce((s,g)=>s+g.capacity,0);
    const totalUsed=groups.reduce((s,g)=>s+g.used,0);
    const model=((inv.manufacturer||'')+' '+(inv.model||d?.project?.inverter_model||'INVERTER')).trim();
    const project=d?.project?.name||'Solar Project';
    const module=d?.module?.model||'Module';

    let s=`<svg id="stringSvg" class="engineering-svg single-line44" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
      <style>
        text{font-family:Segoe UI,Arial,sans-serif}.title44{fill:#f5f8fa;font-size:29px;font-weight:700}.sub44{fill:#9bb4c3;font-size:15px}
        .inv44{fill:#fff;font-size:24px;font-weight:700}.invmeta44{fill:#c4d7e2;font-size:14px}.mppt44{fill:#fff;font-size:17px;font-weight:800}
        .cap44{fill:#eeb04b;font-size:13px;font-weight:800}.capdetail44{fill:#a9bfcb;font-size:12px}.wire44{stroke:#d0dde4;stroke-width:1.7;fill:none}
        .bus44{stroke:#f0a226;stroke-width:2.8;fill:none}.terminal44{fill:#eab04c;font-size:12px;font-weight:800}.string44{fill:#f5f8fa;font-size:12px;font-weight:700}
        .elect44{fill:#9fb8c6;font-size:10.5px}.switch44{fill:#7f9aaa;font-size:10px}.spare44{fill:#8199a7;font-size:11px;font-weight:700}
      </style>
      <rect width="${W}" height="${H}" fill="#0b1821"/>
      <text x="${margin}" y="42" class="title44">${e44(project)}</text>
      <text x="${margin}" y="68" class="sub44">${e44(module)} • ${f44(d.total_modules,0)} Panels • ${f44(d.number_of_strings,0)} Strings • ${mpptCount} MPPT • ${totalUsed}/${totalCapacity} DC string inputs used</text>
      <rect x="${invX}" y="${invY}" width="${invW}" height="${invH}" rx="12" fill="#15384d" stroke="#6f93a7" stroke-width="1.5"/>
      <text x="${W/2}" y="${invY+38}" text-anchor="middle" class="inv44">${e44(model)}</text>
      <text x="${W/2}" y="${invY+66}" text-anchor="middle" class="invmeta44">${f44(inv.rated_ac_kw||d?.project?.ac_kw,0)} kW AC • ${mpptCount} MPPT • ${f44(inv.inputs_per_mppt||d.inputs_per_mppt||1,0)} inputs/MPPT • Max ${totalCapacity} strings</text>`;

    const finalBusY=firstRowTop+(rows-1)*rowH+42;
    s+=`<path d="M${W/2} ${invY+invH} V${finalBusY}" class="bus44"/>`;
    for(let r=0;r<rows;r++){
      const start=r*maxPerRow,end=Math.min(groups.length,start+maxPerRow);
      s+=rowDiagram44(groups,start,end,firstRowTop+r*rowH,W,margin,gap,groupW,r);
    }
    s+=`</svg>`;
    return s;
  };

  // Adds a compact MPPT capacity table under the main calculation so the same information
  // is readable without zooming the SVG.
  const prevRender44=typeof renderDesign==='function'?renderDesign:null;
  if(prevRender44){
    renderDesign=function(){
      if(typeof state!=='undefined'&&state.design)prep44(state.design);
      prevRender44();
      if(typeof document==='undefined'||!state?.design)return;
      const out=document.getElementById('designOut');if(!out)return;
      const old=document.getElementById('mpptCapacity44');if(old)old.remove();
      const groups=mpptGroups44(state.design);
      const wrap=document.createElement('div');wrap.id='mpptCapacity44';wrap.className='card gap mppt-capacity44';
      wrap.innerHTML=`<div class="row"><div><h2 style="margin:0">MPPT / String Capacity</h2><small>แสดงจำนวน String สูงสุดและจำนวนที่ใช้งานจริงของแต่ละ MPPT</small></div><span class="badge ok">${groups.reduce((a,g)=>a+g.used,0)} / ${groups.reduce((a,g)=>a+g.capacity,0)} Used</span></div>
      <div class="mppt-grid44">${groups.map(g=>`<div class="mppt-card44"><div><b>MPPT${g.mppt}</b><span>${g.used}/${g.capacity} strings</span></div><small>${g.assigned.length?g.assigned.map(s=>`S${pad44(s.string_no)} → ${e44(s.terminal||`Input ${s.input_no||'-'}`)}`).join(' • '):'No string assigned'}</small></div>`).join('')}</div>`;
      const terminal=document.getElementById('terminalPlan43');
      if(terminal)out.insertBefore(wrap,terminal);else out.appendChild(wrap);
    };
  }

  if(typeof document!=='undefined'&&!document.getElementById('uat44Style')){
    const st=document.createElement('style');st.id='uat44Style';st.textContent=`
      .single-line44{width:100%;min-height:640px;display:block;background:#0b1821;border-radius:14px}
      .mppt-capacity44{border-top:4px solid #d99a2b}.mppt-grid44{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:14px}
      .mppt-card44{border:1px solid #d7e0e6;border-radius:10px;padding:11px 12px;background:#f8fafb}.mppt-card44>div{display:flex;justify-content:space-between;gap:12px;align-items:center}
      .mppt-card44 b{color:#123245}.mppt-card44 span{font-size:12px;font-weight:700;color:#b97809}.mppt-card44 small{display:block;margin-top:6px;color:#627783;line-height:1.45}
    `;document.head.appendChild(st);
  }

  window.SolarBOQSingleLine44={mpptGroups:mpptGroups44,prepare:prep44};
})();
