// UAT v0.4.6 - MDB SOLAR for multi-inverter projects
// Current confirmed rule: when project has 2+ identical inverters, create MDB SOLAR as MA isolation point.
// Each inverter keeps its feeder breaker from v0.4.5; MDB main breaker = feeder breaker x inverter quantity.
(function(){
  function e46(v){return typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,'');}
  function f46(v,d=0){const n=Number(v||0);return Number.isFinite(n)?n.toLocaleString(undefined,{maximumFractionDigits:d}):'-';}
  function qty46(d){return Math.max(1,Number(d?.project?.inverter_qty||1));}

  function calc46(d){
    const qty=qty46(d);
    const feeder=window.SolarBOQCable45?.calculate?window.SolarBOQCable45.calculate(d):null;
    if(qty<2)return {required:false,qty,feeder};
    if(!feeder?.supported)return {required:true,qty,feeder,status:'REVIEW',message:'ยังคำนวณ Inverter feeder breaker ไม่ได้'};
    const feederBreakerA=Number(feeder.breakerA||0);
    const mainBreakerA=feederBreakerA*qty;
    return {
      required:true,qty,feeder,status:'PASS',
      feederBreakerA,feederBreakerQty:qty,mainBreakerA,mainBreakerQty:1,
      title:'MDB SOLAR',
      summary:`${qty} × ${f46(feederBreakerA)} A incomer + 1 × ${f46(mainBreakerA)} A main`
    };
  }

  function card46(d){
    const m=calc46(d);d.mdb_solar=m;
    if(!m.required)return '';
    if(m.status!=='PASS')return `<div class="card mdb46 review46"><div class="mdbhead46"><div><small>MULTI-INVERTER</small><h2>MDB SOLAR</h2></div><span class="badge warn">REVIEW</span></div><p class="muted">${e46(m.message||'')}</p></div>`;
    return `<div class="card mdb46">
      <div class="mdbhead46"><div><small>MULTI-INVERTER AC DISTRIBUTION</small><h2>MDB SOLAR</h2></div><span class="badge ok">AUTO</span></div>
      <div class="mdbsummary46">
        <div><span>Inverters</span><b>${f46(m.qty)} Units</b></div>
        <div><span>Incomer Breakers</span><b>${f46(m.feederBreakerQty)} × ${f46(m.feederBreakerA)} A</b></div>
        <div class="main46"><span>Main Breaker</span><b>${f46(m.mainBreakerA)} A</b></div>
      </div>
      <details class="mdbdetail46"><summary>ดูรายละเอียด MDB SOLAR</summary><div class="mdbrows46">
        ${Array.from({length:m.qty},(_,i)=>`<div><b>INV-${String(i+1).padStart(2,'0')}</b><span>MCCB ${f46(m.feederBreakerA)} A</span><small>${e46(m.feeder?.cableLabel||'-')}</small></div>`).join('')}
        <div class="mainrow46"><b>MDB MAIN</b><span>MCCB ${f46(m.mainBreakerA)} A</span><small>Maintenance isolation / main outgoing</small></div>
      </div></details>
    </div>`;
  }

  const prevDiagram46=typeof diagramSvg==='function'?diagramSvg:null;
  if(prevDiagram46){
    diagramSvg=function(d){
      const m=calc46(d);d.mdb_solar=m;
      let svg=String(prevDiagram46(d));
      if(!m.required||m.status!=='PASS')return svg;

      // Remove the single-inverter AC feeder callout from v0.4.5 and replace it with a multi-inverter MDB summary.
      svg=svg.replace(/<g class="acfeed45">[\s\S]*?<\/g>/,'');
      svg=svg.replace('</style>',`.mdbtitle46{fill:#fff;font-size:15px;font-weight:800}.mdblabel46{fill:#9fb7c4;font-size:11px;font-weight:700}.mdbval46{fill:#f0b34d;font-size:16px;font-weight:800}.mdbmeta46{fill:#9ab0bc;font-size:10.5px}</style>`);

      const x=1380,y=96,w=465,h=150;
      const feederText=`${m.feederBreakerQty} × MCCB ${f46(m.feederBreakerA)} A`;
      const mainText=`MAIN MCCB ${f46(m.mainBreakerA)} A`;
      const g=`<g class="mdbsolar46">
        <path d="M1340 148 H${x}" stroke="#80b9d4" stroke-width="3" fill="none"/>
        <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#102733" stroke="#6f9db2" stroke-width="1.7"/>
        <text x="${x+18}" y="${y+27}" class="mdbtitle46">MDB SOLAR</text>
        <text x="${x+w-18}" y="${y+27}" text-anchor="end" class="mdblabel46">${f46(m.qty)} INVERTERS</text>
        <line x1="${x+18}" y1="${y+38}" x2="${x+w-18}" y2="${y+38}" stroke="#31576a"/>
        <text x="${x+18}" y="${y+64}" class="mdblabel46">INVERTER INCOMERS</text>
        <text x="${x+18}" y="${y+88}" class="mdbval46">${feederText}</text>
        <text x="${x+18}" y="${y+113}" class="mdblabel46">MAIN BREAKER</text>
        <text x="${x+18}" y="${y+137}" class="mdbval46">${mainText}</text>
        <path d="M${x+w} ${y+75} H1885" stroke="#80b9d4" stroke-width="3" fill="none"/>
      </g>`;
      return svg.replace('</svg>',g+'</svg>');
    };
  }

  const prevRender46=typeof renderDesign==='function'?renderDesign:null;
  if(prevRender46){
    renderDesign=function(){
      prevRender46();
      if(typeof document==='undefined'||!state?.design)return;
      const out=document.getElementById('designOut');if(!out)return;
      const old=document.getElementById('mdbSolar46');if(old)old.remove();
      const html=card46(state.design);if(!html)return;
      const wrap=document.createElement('div');wrap.id='mdbSolar46';wrap.innerHTML=html;
      const cable=document.getElementById('cableAuto45');
      if(cable&&cable.nextSibling)out.insertBefore(wrap,cable.nextSibling);else if(cable)out.appendChild(wrap);else out.insertBefore(wrap,out.firstChild);
    };
  }

  if(typeof document!=='undefined'&&!document.getElementById('uat46Style')){
    const st=document.createElement('style');st.id='uat46Style';st.textContent=`
      .mdb46{border:1px solid #d9e3e8;border-top:4px solid #bd8a25;padding:18px 20px;background:#fff}.mdbhead46{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.mdbhead46 small{font-size:11px;letter-spacing:.1em;color:#7d8f98;font-weight:800}.mdbhead46 h2{margin:3px 0 0;color:#18384a;font-size:20px}.mdbsummary46{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:15px}.mdbsummary46>div{padding:13px 14px;border:1px solid #e0e7eb;border-radius:10px;background:#f8fafb}.mdbsummary46 span{display:block;font-size:12px;color:#70838d}.mdbsummary46 b{display:block;margin-top:4px;font-size:20px;color:#18384a}.mdbsummary46 .main46{background:#fff9ed;border-color:#ead6a8}.mdbsummary46 .main46 b{color:#9b6712}.mdbdetail46{margin-top:12px;border-top:1px solid #e5ebee;padding-top:10px}.mdbdetail46 summary{cursor:pointer;font-size:12px;font-weight:700;color:#58717d}.mdbrows46{display:grid;gap:8px;margin-top:10px}.mdbrows46>div{display:grid;grid-template-columns:120px 150px 1fr;gap:10px;align-items:center;padding:9px 11px;background:#f7f9fa;border-radius:8px}.mdbrows46 span{font-weight:700;color:#24495c}.mdbrows46 small{color:#758b96}.mdbrows46 .mainrow46{background:#fff8e9}.review46{border-top-color:#d79a31}@media(max-width:900px){.mdbsummary46{grid-template-columns:1fr}.mdbrows46>div{grid-template-columns:1fr}}
    `;document.head.appendChild(st);
  }

  window.SolarBOQMDB46={calculate:calc46};
})();
