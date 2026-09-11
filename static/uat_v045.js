// UAT v0.4.5 - Automatic AC breaker/cable selection + cleaner String Design UI
// Confirmed company rules:
//   Design current = inverter max output current x 1.20
//   Design current < breaker rating < cable ampacity
//   Multi-core cable is limited to 35 mm2; if it cannot satisfy the breaker, switch to single-core.
(function(){
  const AMPACITY45={
    multi:[
      {mm2:1,a:14},{mm2:1.5,a:18},{mm2:2.5,a:24},{mm2:4,a:32},{mm2:6,a:40},
      {mm2:10,a:55},{mm2:16,a:73},{mm2:25,a:96},{mm2:35,a:116}
    ],
    single:[
      {mm2:25,a:106},{mm2:35,a:131},{mm2:50,a:159},{mm2:70,a:202},{mm2:95,a:245},
      {mm2:120,a:284},{mm2:150,a:311},{mm2:185,a:349},{mm2:240,a:410},{mm2:300,a:468},
      {mm2:400,a:531},{mm2:500,a:606}
    ]
  };

  // The three UAT cases below are confirmed from the current verified inverter data + user's company practice.
  const INV_RULE45=[
    {match:/SUN2000-50KTL-M3/i,maxA:79.8,breakerA:100},
    {match:/SUN2000-100KTL-M2/i,maxA:160.4,breakerA:200},
    {match:/SUN(?:2000|5000)-150K-MG0/i,maxA:240.5,breakerA:300}
  ];

  function esc45(v){return typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
  function fmt45(v,d=2){const n=Number(v||0);return Number.isFinite(n)?n.toLocaleString(undefined,{maximumFractionDigits:d}):'-';}
  function model45(d){const inv=d?.inverter||{};return String(inv.model||d?.project?.inverter_model||'').trim();}

  function cableCalc45(d){
    const model=model45(d), rule=INV_RULE45.find(r=>r.match.test(model));
    if(!rule){
      return {supported:false,model,status:'REVIEW',message:'ยังไม่มี Company Cable Rule ที่ยืนยันสำหรับ Inverter รุ่นนี้'};
    }
    const maxA=Number(rule.maxA),designA=maxA*1.20,breakerA=Number(rule.breakerA);
    const multi=AMPACITY45.multi.find(x=>x.mm2<=35&&x.a>breakerA)||null;
    let selected=multi,cableType='Multi-core',switched=false;
    if(!selected){selected=AMPACITY45.single.find(x=>x.a>breakerA)||null;cableType='Single-core';switched=true;}
    if(!selected){return {supported:false,model,maxA,designA,breakerA,status:'FAIL',message:'ไม่มีขนาดสายในตารางที่รองรับ Breaker นี้'};}
    const pass=designA<breakerA&&breakerA<selected.a;
    return {
      supported:true,model,maxA,designA,breakerA,cableType,cableMm2:selected.mm2,cableAmpacityA:selected.a,
      switched,status:pass?'PASS':'FAIL',
      cableLabel:`CV ${cableType} ${selected.mm2} mm²`,
      relation:`${fmt45(designA,2)} A < ${fmt45(breakerA,0)} A < ${fmt45(selected.a,0)} A`
    };
  }

  function cableCard45(d){
    const c=cableCalc45(d);d.ac_cable=c;
    if(!c.supported){
      return `<div class="card cable-card45 review45"><div class="cable-head45"><div><small>AUTO AC FEEDER</small><h2>ต้องตรวจสอบ Cable Rule</h2></div><span class="badge warn">REVIEW</span></div><p class="muted">${esc45(c.message||'')}</p></div>`;
    }
    return `<div class="card cable-card45">
      <div class="cable-head45"><div><small>AUTO AC FEEDER</small><h2>${esc45(c.model)}</h2></div><span class="badge ${c.status==='PASS'?'ok':'warn'}">${c.status}</span></div>
      <div class="cable-summary45">
        <div><span>Design Current</span><b>${fmt45(c.designA,2)} A</b></div>
        <div><span>Breaker</span><b>${fmt45(c.breakerA,0)} A</b></div>
        <div class="selected45"><span>AC Cable</span><b>${esc45(c.cableLabel)}</b><small>Ampacity ${fmt45(c.cableAmpacityA,0)} A</small></div>
      </div>
      <details class="cable-details45">
        <summary>ดูรายละเอียดการคำนวณ</summary>
        <div class="detail-grid45">
          <div><span>Max Output Current</span><b>${fmt45(c.maxA,1)} A</b></div>
          <div><span>Safety factor</span><b>× 1.20</b></div>
          <div><span>Design Current</span><b>${fmt45(c.designA,2)} A</b></div>
          <div><span>Selected Breaker</span><b>${fmt45(c.breakerA,0)} A</b></div>
          <div><span>Cable Ampacity</span><b>${fmt45(c.cableAmpacityA,0)} A</b></div>
          <div><span>Check</span><b>${esc45(c.relation)}</b></div>
        </div>
        ${c.switched?`<p class="detail-note45">Multi-core ถูกจำกัดสูงสุดที่ 35 mm² ตาม Company Rule จึงเปลี่ยนเป็น Single-core อัตโนมัติ</p>`:''}
      </details>
    </div>`;
  }

  const previousDiagram45=typeof diagramSvg==='function'?diagramSvg:null;
  if(previousDiagram45){
    diagramSvg=function(d){
      const c=cableCalc45(d);d.ac_cable=c;
      let svg=String(previousDiagram45(d));
      if(!c.supported)return svg;
      const cable=esc45(c.cableLabel);
      const feeder=`
        <g class="acfeed45">
          <path d="M1340 148 H1412" stroke="#80b9d4" stroke-width="3" fill="none"/>
          <rect x="1412" y="117" width="118" height="62" rx="8" fill="#102a39" stroke="#7aa6ba" stroke-width="1.5"/>
          <text x="1471" y="142" text-anchor="middle" class="aclabel45">MCCB</text>
          <text x="1471" y="166" text-anchor="middle" class="acvalue45">${fmt45(c.breakerA,0)} A</text>
          <path d="M1530 148 H1570" stroke="#80b9d4" stroke-width="3" fill="none"/>
          <rect x="1570" y="104" width="295" height="88" rx="10" fill="#0f202c" stroke="#4d7184" stroke-width="1.4"/>
          <text x="1590" y="130" class="aclabel45">AC FEEDER</text>
          <text x="1590" y="156" class="accable45">${cable}</text>
          <text x="1590" y="179" class="acmeta45">Ampacity ${fmt45(c.cableAmpacityA,0)} A • Design ${fmt45(c.designA,2)} A</text>
        </g>`;
      svg=svg.replace('</style>',`.aclabel45{fill:#9eb8c6;font-size:12px;font-weight:700}.acvalue45{fill:#fff;font-size:18px;font-weight:800}.accable45{fill:#f0b34d;font-size:16px;font-weight:800}.acmeta45{fill:#91aab8;font-size:11px}</style>`);
      return svg.replace('</svg>',feeder+'</svg>');
    };
  }

  const prevRender45=typeof renderDesign==='function'?renderDesign:null;
  if(prevRender45){
    renderDesign=function(){
      prevRender45();
      if(typeof document==='undefined'||!state?.design)return;
      const out=document.getElementById('designOut');if(!out)return;
      const old=document.getElementById('cableAuto45');if(old)old.remove();
      const wrap=document.createElement('div');wrap.id='cableAuto45';wrap.innerHTML=cableCard45(state.design);
      out.insertBefore(wrap,out.firstChild);
    };
  }

  if(typeof document!=='undefined'&&!document.getElementById('uat45Style')){
    const st=document.createElement('style');st.id='uat45Style';st.textContent=`
      #designOut{display:grid;gap:16px}.cable-card45{border:1px solid #d9e3e8;border-top:4px solid #1b86b8;padding:18px 20px;background:#fff}
      .cable-head45{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.cable-head45 small{font-size:11px;letter-spacing:.11em;font-weight:800;color:#78909c}.cable-head45 h2{margin:3px 0 0;font-size:19px;color:#173447}
      .cable-summary45{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:15px}.cable-summary45>div{padding:13px 14px;border:1px solid #e0e7eb;border-radius:10px;background:#f8fafb;min-width:0}
      .cable-summary45 span{display:block;color:#70838d;font-size:12px;margin-bottom:4px}.cable-summary45 b{display:block;color:#14384d;font-size:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cable-summary45 small{display:block;margin-top:4px;color:#81939c}.cable-summary45 .selected45{background:#f5fafc;border-color:#bcdbe8}.cable-summary45 .selected45 b{color:#0877a7}
      .cable-details45{margin-top:12px;border-top:1px solid #e5ebee;padding-top:10px}.cable-details45 summary{cursor:pointer;color:#58717d;font-weight:700;font-size:12px;user-select:none}.detail-grid45{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:11px}
      .detail-grid45>div{padding:9px 10px;background:#f6f8f9;border-radius:8px}.detail-grid45 span{display:block;font-size:11px;color:#7b8f99}.detail-grid45 b{display:block;margin-top:2px;color:#294a5b;font-size:13px}.detail-note45{margin:10px 0 0;padding:8px 10px;border-radius:7px;background:#fff8e8;color:#8a661b;font-size:12px}.review45{border-top-color:#d79a31}
      @media(max-width:900px){.cable-summary45,.detail-grid45{grid-template-columns:1fr}.cable-summary45 b{white-space:normal}}
    `;document.head.appendChild(st);
  }

  window.SolarBOQCable45={calculate:cableCalc45,ampacity:AMPACITY45};
})();
