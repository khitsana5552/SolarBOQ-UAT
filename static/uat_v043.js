// UAT v0.4.3 - Huawei DC input terminal allocation from supplied manual figures
// SUN2000-50KTL-M3: Figure 5-14 exact terminal selections for 1-8 PV strings.
// SUN2000-100KTL-M2: Figure 5-20 exact terminal selections for 11-19 PV inputs.
// For 1-10 on 100KTL-M2, the program follows the manual guidance to prefer
// even-numbered PV terminals so the maximum number of MPPT circuits is used.
(function(){
  function norm43(v){return String(v||'').toUpperCase().replace(/\s+/g,'').replace(/\(400V\)/g,'');}
  function pvNum43(v){return Number(String(v||'').replace(/[^0-9]/g,''))||0;}
  function terminalInfo43(pv,model){
    const n=pvNum43(pv), mppt=Math.ceil(n/2), input=n%2===1?1:2;
    let sw='';
    if(norm43(model).includes('SUN2000-100KTL-M2')) sw=n<=8?'SWITCH 1':n<=14?'SWITCH 2':'SWITCH 3';
    return {terminal:`PV${n}`,pv:n,mppt,input,switch:sw};
  }

  const MAP50_43={
    1:[1],
    2:[1,7],
    3:[1,3,7],
    4:[1,3,5,7],
    5:[1,2,3,5,7],
    6:[1,2,3,5,7,8],
    7:[1,2,3,4,5,7,8],
    8:[1,2,3,4,5,6,7,8]
  };
  const MAP100_EXACT_43={
    11:[1,2,4,6,8,10,12,14,16,18,20],
    12:[1,2,4,6,8,10,12,14,16,18,19,20],
    13:[1,2,4,5,6,8,10,12,14,16,18,19,20],
    14:[1,2,4,5,6,8,10,12,14,15,16,18,19,20],
    15:[1,2,4,5,6,8,9,10,12,14,15,16,18,19,20],
    16:[1,2,4,5,6,8,9,10,12,13,14,16,17,18,19,20],
    17:[1,2,3,4,6,7,8,9,10,12,13,14,16,17,18,19,20],
    18:[1,2,3,4,5,6,8,9,10,11,12,14,15,16,17,18,19,20],
    19:[1,2,3,4,5,6,7,8,9,10,12,13,14,15,16,17,18,19,20]
  };

  function buildPlan43(d){
    const inv=d?.inverter||{}, model=String(inv.model||d?.project?.inverter_model||''), key=norm43(model);
    const count=Number(d?.number_of_strings||(d?.strings||[]).length||0);
    let nums=null, source='', exact=false, note='';

    if(key.includes('SUN2000-50KTL-M3')){
      nums=MAP50_43[count]||null;
      source='Figure 5-14 • SUN2000-50KTL-M3';
      exact=!!nums;
      if(!nums) note=`Figure 5-14 supplied in this project covers 1-8 PV strings; calculated design has ${count} strings.`;
    }else if(key.includes('SUN2000-100KTL-M2')){
      if(MAP100_EXACT_43[count]){
        nums=MAP100_EXACT_43[count].slice();
        source='Figure 5-20 • SUN2000-100KTL-M2';
        exact=true;
      }else if(count>=1&&count<=10){
        nums=Array.from({length:count},(_,i)=>(i+1)*2);
        source='SUN2000-100KTL-M2 manual guidance • even PV terminals preferred';
        exact=false;
        note='1-10 inputs are guidance-derived because the supplied Figure 5-20 table explicitly lists 11-19 inputs. Verify against the applicable manual revision before construction.';
      }else if(count===20){
        nums=Array.from({length:20},(_,i)=>i+1);
        source='SUN2000-100KTL-M2 • full 20-input configuration';
        exact=false;
        note='All 20 DC inputs are occupied.';
      }else{
        source='Figure 5-20 • SUN2000-100KTL-M2';
        note=`The supplied Figure 5-20 table does not provide a terminal selection for ${count} PV inputs.`;
      }
    }else{
      return {supported:false,model,count,source:'',exact:false,note:'DC terminal mapping is not registered for this inverter model.',slots:[]};
    }

    const slots=(nums||[]).map(n=>terminalInfo43(`PV${n}`,model));
    return {supported:!!nums&&slots.length===count,model,count,source,exact,note,slots};
  }

  function refreshMpptChecks43(d){
    if(!d?.terminal_plan?.supported)return;
    const inv=d.inverter||{}, strings=d.strings||[];
    const nMppt=Number(inv.num_mppt||d.num_mppt||0);
    const replace=(name,status,value)=>{
      d.checks=Array.isArray(d.checks)?d.checks:[];
      const hit=d.checks.find(x=>String(x.name||'')===name);
      if(hit){hit.status=status;hit.value=value;} else d.checks.push({name,status,value});
    };
    if(Number(inv.max_current_mppt||0)>0&&Number(d.imp||0)>0&&nMppt){
      let fail=false,details=[];
      for(let m=1;m<=nMppt;m++){
        const c=strings.filter(s=>Number(s.mppt)===m).length;if(!c)continue;
        const a=c*Number(d.imp);fail=fail||a>Number(inv.max_current_mppt);details.push(`MPPT${m} ${a.toFixed(2)}A`);
      }
      replace('MPPT input current',fail?'FAIL':'PASS',`${details.join(', ')}; limit ${Number(inv.max_current_mppt).toFixed(2)}A/MPPT`);
    }
    if(Number(inv.max_isc_mppt||0)>0&&Number(d.isc||0)>0&&nMppt){
      let fail=false,details=[];
      for(let m=1;m<=nMppt;m++){
        const c=strings.filter(s=>Number(s.mppt)===m).length;if(!c)continue;
        const a=c*Number(d.isc);fail=fail||a>Number(inv.max_isc_mppt);details.push(`MPPT${m} ${a.toFixed(2)}A`);
      }
      replace('MPPT short-circuit current',fail?'FAIL':'PASS',`${details.join(', ')}; limit ${Number(inv.max_isc_mppt).toFixed(2)}A/MPPT`);
    }
  }

  function applyPlan43(d){
    if(!d)return null;
    const plan=buildPlan43(d);d.terminal_plan=plan;
    (d.strings||[]).forEach(s=>{delete s.terminal;delete s.dc_switch;delete s.terminal_source;});
    if(!plan.supported)return plan;

    // Replace the generic allocator with the inverter manual terminal selection.
    const strings=(d.strings||[]).slice().sort((a,b)=>Number(a.string_no)-Number(b.string_no));
    strings.forEach((s,i)=>{
      const slot=plan.slots[i];if(!slot)return;
      s.terminal=slot.terminal;s.mppt=slot.mppt;s.input_no=slot.input;s.dc_switch=slot.switch;s.terminal_source=plan.source;
    });

    d.warnings=(Array.isArray(d.warnings)?d.warnings:[]).filter(w=>!/^MPPT\d+ contains strings/.test(String(w||'')));
    const groups={};strings.forEach(s=>{if(!s.mppt)return;(groups[s.mppt]||(groups[s.mppt]=[])).push(s);});
    Object.entries(groups).forEach(([m,arr])=>{
      if(arr.length>1&&new Set(arr.map(x=>Number(x.modules))).size>1){
        d.warnings.push(`MPPT${m} has parallel strings with different module counts after manual terminal mapping. Review string balancing before construction.`);
      }
    });
    refreshMpptChecks43(d);
    return plan;
  }

  function esc43(v){return typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,'');}
  function f43(v){return typeof fmt==='function'?fmt(v):Number(v||0).toLocaleString();}
  function terminalCard43(d){
    const p=d?.terminal_plan;if(!p)return '';
    const ok=p.supported;
    const rows=(d.strings||[]).slice().sort((a,b)=>Number(a.string_no)-Number(b.string_no)).map(s=>
      `<tr><td><b>S${String(s.string_no).padStart(2,'0')}</b></td><td>${f43(s.modules)} Panels</td><td>${s.terminal?`<b>${esc43(s.terminal)}</b>`:'-'}</td><td>${s.mppt?`MPPT ${s.mppt}`:'-'}</td><td>${s.terminal?`Input ${s.input_no}`:'-'}</td><td>${esc43(s.dc_switch||'-')}</td></tr>`
    ).join('');
    return `<div class="card gap terminal-plan43">
      <div class="row"><div><h2 style="margin:0">DC Input Terminal Plan</h2><small>${esc43(p.model||'Inverter')} • ${p.count} PV Strings</small></div><span class="badge ${ok?'ok':'warn'}">${ok?(p.exact?'Manual Figure':'Guidance'):'Not mapped'}</span></div>
      <div class="terminal-source43"><b>Source:</b> ${esc43(p.source||'-')}${p.note?`<br><span>${esc43(p.note)}</span>`:''}</div>
      ${ok?`<div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>String</th><th>Size</th><th>DC Terminal</th><th>MPPT</th><th>Port</th><th>DC Switch</th></tr></thead><tbody>${rows}</tbody></table></div>`:`<div class="bad" style="margin-top:12px">${esc43(p.note||'Terminal selection unavailable for this design.')}</div>`}
    </div>`;
  }

  if(typeof document!=='undefined'&&!document.getElementById('uat43Style')){
    const st=document.createElement('style');st.id='uat43Style';st.textContent=`
      .terminal-plan43{border-top:4px solid #1d7fae}.terminal-source43{margin-top:12px;padding:10px 12px;border-radius:9px;background:#f4f8fb;color:#385366;line-height:1.45}
      .terminal-source43 span{color:#708594}.terminal-plan43 td,.terminal-plan43 th{white-space:nowrap}.terminal-plan43 td:nth-child(3){font-size:15px}
    `;document.head.appendChild(st);
  }

  const previousDiagramSvg43=typeof diagramSvg==='function'?diagramSvg:null;
  if(previousDiagramSvg43){
    diagramSvg=function(d){
      applyPlan43(d);
      const clone=JSON.parse(JSON.stringify(d));
      (clone.strings||[]).forEach(s=>{if(s.terminal)s.input_no=s.terminal;});
      let out=previousDiagramSvg43(clone);
      return String(out).replace(/>Input (PV\d+)</g,'>Terminal $1<');
    };
  }

  const previousRenderDesign43=typeof renderDesign==='function'?renderDesign:null;
  if(previousRenderDesign43){
    renderDesign=function(){
      if(typeof state!=='undefined'&&state.design)applyPlan43(state.design);
      previousRenderDesign43();
      if(typeof document==='undefined')return;
      const out=document.getElementById('designOut');
      if(out&&typeof state!=='undefined'&&state.design){
        const old=document.getElementById('terminalPlan43');if(old)old.remove();
        const wrap=document.createElement('div');wrap.id='terminalPlan43';wrap.innerHTML=terminalCard43(state.design);out.appendChild(wrap);
      }
    };
  }

  // Exposed only for UAT regression checks in the browser console.
  window.SolarBOQTerminal43={buildPlan:buildPlan43,applyPlan:applyPlan43};
})();
