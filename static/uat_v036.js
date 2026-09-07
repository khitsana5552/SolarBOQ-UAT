// UAT v0.3.6 layout overrides: simplified Project Data + large engineering String Diagram

projectPage=async function(c){
  if(!reqProject())return;
  const p=state.current,t=await api('/api/templates');
  c.innerHTML=`<div class="grid cols2">
    <div class="card"><h2>Project Data</h2><div class="project-simple-grid">
      <label>Project Name<input id="pname" value="${esc(p.name)}"></label>
      <label>Template<select id="ptpl">${Object.keys(t).map(x=>`<option ${x==p.template?'selected':''}>${esc(x)}</option>`).join('')}</select></label>
      <label>Utility<select id="putility"><option ${p.utility==='PEA'?'selected':''}>PEA</option><option ${p.utility==='MEA'?'selected':''}>MEA</option></select></label>
    </div><div class="toolbar" style="margin-top:16px"><button id="saveP">Save Project Data</button></div></div>
    <div class="card"><h2>Import Production Report</h2><div class="uat-drop"><input id="prfile" type="file" accept="application/pdf"><button id="importPr">Import PR → Project Data</button></div><p class="muted">ดึง DC / AC / Module / Qty / Inverter / Strings / Cable จาก Production Report</p></div>
  </div>
  <div class="card gap"><div class="row"><div><h3 style="margin:0">Technical Data from PR</h3><small>ข้อมูลสำหรับ String Design และ BOQ</small></div></div><div class="summary project-tech-summary">${[
    ['DC Capacity',fmt(p.dc_kwp)+' kWp'],['AC Capacity',fmt(p.ac_kw)+' kW'],['Module',p.module_model||'-'],['Module Qty',fmt(p.module_qty)],['Inverter',p.inverter_model||'-'],['Inverter Qty',fmt(p.inverter_qty)],['Strings',fmt(p.aurora_strings)],['String Cable',fmt(p.aurora_string_cable_m)+' m'],['PR',fmt(p.performance_ratio)+' %']
  ].map(x=>`<div><small>${x[0]}</small><b>${esc(x[1])}</b></div>`).join('')}</div></div>`;
  $('#saveP').onclick=async()=>{await api(`/api/projects/${p.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({name:$('#pname').value,template:$('#ptpl').value,utility:$('#putility').value})});await loadProjects(p.id);toast('บันทึก Project Data แล้ว');render()};
  $('#importPr').onclick=async()=>{const f=$('#prfile').files[0];if(!f)return toast('เลือก Production Report PDF');const fd=new FormData();fd.append('file',f);toast('กำลังอ่าน PR...');await api(`/api/projects/${p.id}/import-pr`,{method:'POST',body:fd});await loadProjects(p.id);toast('Import PR แล้ว');render()};
};

stringPage=async function(c){
  if(!reqProject())return;
  state.equipment=await api('/api/equipment');
  const mods=state.equipment.filter(x=>x.type==='module'),invs=state.equipment.filter(x=>x.type==='inverter'),rsds=state.equipment.filter(x=>x.type==='rsd');
  c.innerHTML=`<div class="card string-control-card"><div class="string-control-head"><div><h2 style="margin:0">String Design</h2><small>เลือกอุปกรณ์ → คำนวณ → ตรวจ MPPT และ String Diagram</small></div><div class="toolbar"><button class="secondary" id="smartSel">Smart Select from PR</button><button id="calc">Calculate & Draw</button></div></div>
    <div class="string-input-grid">
      <label>Module<select id="modSel"><option value="">-- select module --</option>${mods.map(x=>`<option value="${x.id}">${esc(x.manufacturer+' '+x.model)} (${fmt(x.power_w)} W)</option>`).join('')}</select></label>
      <label>Inverter<select id="invSel"><option value="">-- select inverter --</option>${invs.map(x=>`<option value="${x.id}">${esc(x.manufacturer+' '+x.model)}</option>`).join('')}</select></label>
      <label>Rapid Shutdown<select id="rsdSel"><option value="">-- optional --</option>${rsds.map(x=>`<option value="${x.id}">${esc(x.manufacturer+' '+x.model)}</option>`).join('')}</select></label>
      <label>Target Voltage<input id="targetV" type="number" value="800"></label>
    </div><div id="stringSummary"></div></div>
    <div class="card gap diagram-card-full"><div class="string-diagram-head"><div><h2 style="margin:0">Automatic String Diagram</h2><small>แสดง Inverter → MPPT → Input → String แบบเต็มพื้นที่</small></div><div class="toolbar"><button class="secondary" id="saveDiag">Save Diagram</button><button class="secondary" id="largeDiag">Large View</button><button class="secondary" id="svgBtn">Export SVG</button><button class="secondary" id="pngBtn">Export PNG</button></div></div><div id="diagram" class="engineering-diagram"><div class="empty">กด Calculate & Draw เพื่อสร้างแผนภาพ</div></div></div>
    <div class="card gap"><h3>Engineering Checks</h3><div id="checks" class="checks engineering-checks"></div></div>`;

  $('#smartSel').onclick=async()=>{const s=await api(`/api/projects/${state.current.id}/suggest-equipment`);if(s.module)$('#modSel').value=s.module.id;if(s.inverter)$('#invSel').value=s.inverter.id;toast('เลือกอุปกรณ์จาก PR แล้ว')};
  $('#calc').onclick=async()=>{if(!$('#modSel').value)return toast('เลือก Module');const payload={project_id:state.current.id,module_id:+$('#modSel').value,inverter_id:+$('#invSel').value||null,rsd_id:+$('#rsdSel').value||null,target_voltage:+$('#targetV').value||800};state.design=await api('/api/string-design',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});renderDesign()};
  $('#saveDiag').onclick=saveCurrentDiagram;$('#svgBtn').onclick=exportSvg;$('#pngBtn').onclick=exportPng;
  $('#largeDiag').onclick=()=>{if(!state.design)return toast('Calculate ก่อน');openModal('Automatic String Diagram',`<div class="large-diagram-modal">${diagramSvg(state.design)}</div>`)};
  if(state.design)renderDesign();
};

renderDesign=function(){
  if(!state.design)return;
  const d=state.design;
  const sum=$('#stringSummary'),checks=$('#checks'),diagram=$('#diagram');
  if(sum)sum.innerHTML=`<div class="string-summary-bar"><div><small>Module</small><b>${esc(d.module?.model||'-')}</b></div><div><small>Inverter</small><b>${esc(d.inverter?.model||'-')}</b></div><div><small>Max Panel / String</small><b>${d.max_modules_per_string}</b></div><div><small>Total Strings</small><b>${d.number_of_strings}</b></div><div><small>Rule</small><b>FLOOR(${fmt(d.target_voltage)} / ${fmt(d.vmp)})</b></div></div>${(d.warnings||[]).length?`<div class="diagram-warning">⚠ ${(d.warnings||[]).map(esc).join('<br>')}</div>`:''}`;
  if(checks)checks.innerHTML=(d.checks||[]).map(x=>`<div class="check"><span class="badge ${x.status==='PASS'?'ok':x.status==='FAIL'?'bad':'warn'}">${esc(x.status)}</span><div><b>${esc(x.name)}</b><small>${esc(x.value)}</small></div></div>`).join('');
  if(diagram)diagram.innerHTML=diagramSvg(d);
};

function svgText(t){return esc(t)}
diagramSvg=function(d){
  const inv=d.inverter||{},strings=d.strings||[];
  let mppts=Math.max(Number(inv.num_mppt||d.num_mppt||0),...strings.map(s=>Number(s.mppt||0)),1);
  const cols=Math.min(mppts,5),rows=Math.ceil(mppts/cols),W=1680,margin=54,gap=22,cardW=(W-margin*2-gap*(cols-1))/cols;
  const cardH=206,top=230,H=top+rows*(cardH+34)+70;
  let s=`<svg id="stringSvg" class="engineering-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="invGrad" x1="0" x2="1"><stop offset="0" stop-color="#15384d"/><stop offset="1" stop-color="#1d506b"/></linearGradient><filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="7" flood-color="#000" flood-opacity=".22"/></filter></defs><style>text{font-family:Segoe UI,Arial,sans-serif}.title{fill:#fff;font-size:27px;font-weight:700}.sub{fill:#9fb8c8;font-size:16px}.invtitle{fill:#fff;font-size:23px;font-weight:700}.invsub{fill:#c8dce7;font-size:14px}.mpt{fill:#fff;font-size:18px;font-weight:700}.mpsub{fill:#9eb6c5;font-size:12px}.stringNo{fill:#f4b34b;font-size:14px;font-weight:700}.stringData{fill:#fff;font-size:14px;font-weight:700}.stringSub{fill:#bdd0db;font-size:12px}.wire{stroke:#7898ab;stroke-width:2;fill:none}.bus{stroke:#f0a226;stroke-width:3;fill:none}</style><rect width="${W}" height="${H}" rx="22" fill="#0d1b25"/><text x="${margin}" y="50" class="title">${svgText(d.project?.name||'Solar Project')}</text><text x="${margin}" y="80" class="sub">${svgText(d.module?.model||'Module')} • ${d.total_modules||0} Panels • ${d.number_of_strings||0} Strings • Target ${fmt(d.target_voltage)} V</text>`;

  const invW=620,invX=(W-invW)/2;
  s+=`<g filter="url(#shadow)"><rect x="${invX}" y="105" width="${invW}" height="86" rx="15" fill="url(#invGrad)" stroke="#6b91a7"/><text x="${W/2}" y="140" text-anchor="middle" class="invtitle">${svgText((inv.manufacturer||'')+' '+(inv.model||'INVERTER'))}</text><text x="${W/2}" y="168" text-anchor="middle" class="invsub">${fmt(inv.rated_ac_kw||d.project?.ac_kw)} kW AC • ${mppts} MPPT • ${Number(inv.inputs_per_mppt||d.inputs_per_mppt||0)} Inputs/MPPT</text></g>`;

  for(let m=1;m<=mppts;m++){
    const r=Math.floor((m-1)/cols),col=(m-1)%cols,x=margin+col*(cardW+gap),y=top+r*(cardH+34);
    const arr=strings.filter(z=>Number(z.mppt||0)===m);
    const currentA=arr.length&&d.imp?arr.length*Number(d.imp):0;
    s+=`<rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="14" fill="#132a39" stroke="#375a70"/><rect x="${x}" y="${y}" width="${cardW}" height="44" rx="14" fill="#1c4359"/><rect x="${x}" y="${y+31}" width="${cardW}" height="13" fill="#1c4359"/><text x="${x+18}" y="${y+28}" class="mpt">MPPT ${m}</text><text x="${x+cardW-18}" y="${y+27}" text-anchor="end" class="mpsub">${arr.length} String${arr.length===1?'':'s'}${currentA?` • ${fmt(currentA)} A`:''}</text>`;
    if(!arr.length){s+=`<text x="${x+cardW/2}" y="${y+116}" text-anchor="middle" class="mpsub">No string assigned</text>`}
    arr.slice(0,3).forEach((st,j)=>{
      const sy=y+58+j*45;
      s+=`<rect x="${x+14}" y="${sy}" width="${cardW-28}" height="36" rx="8" fill="#0f202c" stroke="#31556b"/><text x="${x+27}" y="${sy+23}" class="stringNo">S${String(st.string_no).padStart(2,'0')}</text><text x="${x+82}" y="${sy+23}" class="stringData">${st.modules} Panels</text><text x="${x+cardW-25}" y="${sy+22}" text-anchor="end" class="stringSub">Input ${st.input_no||'-'} • Vmp ${fmt(st.estimated_vmp)} V • Voc ${fmt(st.estimated_voc)} V</text>`;
    });
    if(arr.length>3)s+=`<text x="${x+cardW/2}" y="${y+194}" text-anchor="middle" class="mpsub">+ ${arr.length-3} more string(s)</text>`;
  }
  const un=strings.filter(z=>!z.mppt);if(un.length)s+=`<text x="${margin}" y="${H-28}" class="sub" fill="#f0a226">Unassigned: ${un.map(z=>'S'+String(z.string_no).padStart(2,'0')).join(', ')}</text>`;
  return s+'</svg>';
};
