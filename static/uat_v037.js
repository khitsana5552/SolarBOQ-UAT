// UAT v0.3.7 - String diagram legibility fix
// Replaces the cramped MPPT cards from v0.3.6 with a wider schematic layout.

(function(){
  function t(v){ return typeof svgText==='function' ? svgText(v) : esc(v); }
  function f(v){ return typeof fmt==='function' ? fmt(v) : Number(v||0).toLocaleString(); }

  diagramSvg=function(d){
    const inv=d.inverter||{}, strings=d.strings||[];
    const mppts=Math.max(Number(inv.num_mppt||d.num_mppt||0),...strings.map(s=>Number(s.mppt||0)),1);
    const cols=Math.min(mppts,4);
    const rows=Math.ceil(mppts/cols);
    const W=1920, margin=64, gap=28;
    const cardW=(W-margin*2-gap*(cols-1))/cols;

    const byMppt={};
    for(let m=1;m<=mppts;m++) byMppt[m]=strings.filter(z=>Number(z.mppt||0)===m);
    const rowStringCounts=[];
    for(let r=0;r<rows;r++){
      let max=0;
      for(let c=0;c<cols;c++){
        const m=r*cols+c+1;
        if(m<=mppts) max=Math.max(max,(byMppt[m]||[]).length);
      }
      rowStringCounts.push(Math.max(1,max));
    }

    const titleY=52, subY=84;
    const invY=118, invH=94, invW=720, invX=(W-invW)/2;
    const firstBusY=254;
    const cardHeaderH=52, stringH=70, cardPadBottom=20;
    const rowGap=66;
    const rowCardHeights=rowStringCounts.map(n=>cardHeaderH+n*stringH+cardPadBottom);
    const rowTops=[];
    let cursor=firstBusY+40;
    for(let r=0;r<rows;r++){
      rowTops.push(cursor);
      cursor += rowCardHeights[r]+rowGap;
    }
    const H=cursor+35;

    let s=`<svg id="stringSvg" class="engineering-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
      <defs>
        <linearGradient id="invGrad37" x1="0" x2="1"><stop offset="0" stop-color="#15384d"/><stop offset="1" stop-color="#245e7c"/></linearGradient>
        <filter id="shadow37" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="5" stdDeviation="8" flood-color="#000" flood-opacity=".25"/></filter>
      </defs>
      <style>
        text{font-family:Segoe UI,Arial,sans-serif}
        .title37{fill:#fff;font-size:30px;font-weight:700}
        .sub37{fill:#9fb8c8;font-size:17px}
        .invtitle37{fill:#fff;font-size:25px;font-weight:700}
        .invsub37{fill:#c8dce7;font-size:15px}
        .mppt37{fill:#fff;font-size:19px;font-weight:700}
        .mpmeta37{fill:#a9c0ce;font-size:13px}
        .sno37{fill:#f4b34b;font-size:16px;font-weight:800}
        .panels37{fill:#fff;font-size:16px;font-weight:700}
        .detail37{fill:#b9ceda;font-size:13px}
        .wire37{stroke:#87a9bc;stroke-width:2.3;fill:none}
        .bus37{stroke:#f0a226;stroke-width:3.2;fill:none}
        .node37{fill:#f0a226}
      </style>
      <rect width="${W}" height="${H}" rx="24" fill="#0d1b25"/>
      <text x="${margin}" y="${titleY}" class="title37">${t(d.project?.name||'Solar Project')}</text>
      <text x="${margin}" y="${subY}" class="sub37">${t(d.module?.model||'Module')} • ${d.total_modules||0} Panels • ${d.number_of_strings||0} Strings • Target ${f(d.target_voltage)} V</text>
      <g filter="url(#shadow37)">
        <rect x="${invX}" y="${invY}" width="${invW}" height="${invH}" rx="16" fill="url(#invGrad37)" stroke="#78a0b7"/>
        <text x="${W/2}" y="${invY+39}" text-anchor="middle" class="invtitle37">${t(((inv.manufacturer||'')+' '+(inv.model||'INVERTER')).trim())}</text>
        <text x="${W/2}" y="${invY+70}" text-anchor="middle" class="invsub37">${f(inv.rated_ac_kw||d.project?.ac_kw)} kW AC • ${mppts} MPPT • ${Number(inv.inputs_per_mppt||d.inputs_per_mppt||0)} Inputs/MPPT</text>
      </g>`;

    // Main trunk from inverter, then one horizontal bus for each MPPT row.
    s+=`<path class="bus37" d="M${W/2} ${invY+invH} V${rowTops[rows-1]-18}"/>`;

    for(let r=0;r<rows;r++){
      const firstM=r*cols+1;
      const lastM=Math.min(mppts,firstM+cols-1);
      const count=lastM-firstM+1;
      const rowTop=rowTops[r];
      const busY=rowTop-18;
      const centers=[];
      for(let c=0;c<count;c++){
        const x=margin+c*(cardW+gap);
        centers.push(x+cardW/2);
      }
      s+=`<path class="bus37" d="M${centers[0]} ${busY} H${centers[centers.length-1]}"/>`;
      s+=`<circle cx="${W/2}" cy="${busY}" r="5" class="node37"/>`;

      for(let c=0;c<count;c++){
        const m=firstM+c;
        const x=margin+c*(cardW+gap), y=rowTop;
        const center=x+cardW/2;
        const arr=byMppt[m]||[];
        const currentA=arr.length&&d.imp?arr.length*Number(d.imp):0;
        const cardH=rowCardHeights[r];

        s+=`<path class="wire37" d="M${center} ${busY} V${y}"/>`;
        s+=`<rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="15" fill="#132a39" stroke="#3b637a"/>`;
        s+=`<path d="M${x+15} ${y} H${x+cardW-15} Q${x+cardW} ${y} ${x+cardW} ${y+15} V${y+52} H${x} V${y+15} Q${x} ${y} ${x+15} ${y}" fill="#1d4d67"/>`;
        s+=`<text x="${x+18}" y="${y+32}" class="mppt37">MPPT ${m}</text>`;
        s+=`<text x="${x+cardW-18}" y="${y+31}" text-anchor="end" class="mpmeta37">${arr.length} String${arr.length===1?'':'s'}${currentA?` • ${f(currentA)} A`:''}</text>`;

        if(!arr.length){
          s+=`<text x="${center}" y="${y+104}" text-anchor="middle" class="mpmeta37">No string assigned</text>`;
        } else {
          arr.forEach((st,j)=>{
            const sy=y+cardHeaderH+10+j*stringH;
            const rowW=cardW-28;
            s+=`<rect x="${x+14}" y="${sy}" width="${rowW}" height="58" rx="9" fill="#0f202c" stroke="#31556b"/>`;
            // First line: string number and panel count. They are deliberately kept separate.
            s+=`<text x="${x+28}" y="${sy+23}" class="sno37">S${String(st.string_no).padStart(2,'0')}</text>`;
            s+=`<text x="${x+92}" y="${sy+23}" class="panels37">${st.modules} Panels</text>`;
            // Second line: electrical data with fixed columns to prevent text overlap.
            s+=`<text x="${x+28}" y="${sy+46}" class="detail37">Input ${st.input_no||'-'}</text>`;
            s+=`<text x="${x+135}" y="${sy+46}" class="detail37">Vmp ${f(st.estimated_vmp)} V</text>`;
            s+=`<text x="${x+cardW-24}" y="${sy+46}" text-anchor="end" class="detail37">Voc ${f(st.estimated_voc)} V</text>`;
          });
        }
      }
    }

    const un=strings.filter(z=>!z.mppt);
    if(un.length){
      s+=`<text x="${margin}" y="${H-22}" class="sub37" fill="#f0a226">Unassigned: ${un.map(z=>'S'+String(z.string_no).padStart(2,'0')).join(', ')}</text>`;
    }
    return s+'</svg>';
  };
})();
