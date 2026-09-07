// UAT v0.3.9 - fully editable BOQ table + export
(function(){
  function masterKey(row){ return `${String(row.item||'').trim()}||${String(row.description||'').trim()}`; }
  function effectiveOverride(cfg,row){
    const k=masterKey(row), ov=(cfg.master_overrides||{})[k]||{};
    const qty=ov.qty!==undefined?Number(ov.qty||0):Number(row.qty||0);
    const rate=ov.rate!==undefined?Number(ov.rate||0):Number(row.rate||0);
    return {...row,qty,rate,total:qty*rate,_master_key:k};
  }
  function hasOverride(cfg,key){ return cfg[key]!==undefined&&cfg[key]!==null&&cfg[key]!==''; }
  function projectRowsV39(b,cfg){
    const p=b.project||{},out=[];
    const mq=hasOverride(cfg,'module_qty_override')?Number(cfg.module_qty_override):Number(p.module_qty||0);
    const iq=hasOverride(cfg,'inverter_qty_override')?Number(cfg.inverter_qty_override):Number(p.inverter_qty||0);
    const moduleModel=String(p.module_model||'').trim();
    out.push(boqRow('1','Solar Module'+(moduleModel?` - ${moduleModel}`:''),'Panel',mq,cfg.module_rate,'project_module',Number(p.module_power_w||0)?`${boqMoney(p.module_power_w)} W`:''));
    const invModel=String(p.inverter_model||'').trim();
    out.push(boqRow('2','Inverter'+(invModel?` - ${invModel}`:(Number(p.ac_kw||0)?` - ${boqMoney(p.ac_kw)} kW`:'')),'Set',iq,cfg.inverter_rate,'project_inverter',Number(p.ac_kw||0)?`${boqMoney(p.ac_kw)} kW AC`:''));
    out.push(boqRow('3',cfg.battery_model||'Battery','Ea',cfg.battery_enabled?cfg.battery_qty:0,cfg.battery_rate,'optional_battery'));
    out.push(boqRow('4',cfg.communication_type,'Set',cfg.communication_qty,cfg.communication_rate,'communication_select'));
    if(Number(p.dc_kwp||0)>200){
      out.push(boqRow('5','Rapid Shutdown','Set',cfg.rsd_enabled?cfg.rsd_qty:0,cfg.rsd_rate,'optional_rsd'));
      out.push(boqRow('6','Transmitter','Set',cfg.transmitter_enabled?cfg.transmitter_qty:0,cfg.transmitter_rate,'optional_transmitter'));
    }
    return out;
  }
  function pNum(key,value,step='1'){return `<input class="boq-project-input boq-cell-input" data-key="${key}" type="number" step="${step}" value="${esc(value)}">`;}
  function projectRowHtmlV39(row,cfg){
    const rule=String(row.rule||'');
    let desc=`<b>${esc(row.description)}</b>`, use='';
    if(rule==='communication_select')desc=`<select class="boq-inline-select" id="boqCommInline">${BOQ_COMMUNICATION_OPTIONS.map(x=>`<option ${x===cfg.communication_type?'selected':''}>${esc(x)}</option>`).join('')}</select>`;
    if(rule==='optional_battery')desc=`<input class="boq-desc-input" id="boqBatteryModelInline" value="${esc(cfg.battery_model||'Battery')}">`;
    if(rule==='optional_battery')use=boqUseToggle('battery_enabled',cfg.battery_enabled,'Include');
    else if(rule==='optional_rsd')use=boqUseToggle('rsd_enabled',cfg.rsd_enabled,'Include');
    else if(rule==='optional_transmitter')use=boqUseToggle('transmitter_enabled',cfg.transmitter_enabled,'Include');
    else use='<span class="badge ok">Required</span>';
    let qty='',rate='';
    if(rule==='project_module'){qty=pNum('module_qty_override',row.qty,'1');rate=pNum('module_rate',cfg.module_rate,'0.01');}
    else if(rule==='project_inverter'){qty=pNum('inverter_qty_override',row.qty,'1');rate=pNum('inverter_rate',cfg.inverter_rate,'0.01');}
    else if(rule==='communication_select'){qty=pNum('communication_qty',cfg.communication_qty,'1');rate=pNum('communication_rate',cfg.communication_rate,'0.01');}
    else if(rule==='optional_battery'){qty=pNum('battery_qty',cfg.battery_qty,'1');rate=pNum('battery_rate',cfg.battery_rate,'0.01');}
    else if(rule==='optional_rsd'){qty=pNum('rsd_qty',cfg.rsd_qty,'1');rate=pNum('rsd_rate',cfg.rsd_rate,'0.01');}
    else if(rule==='optional_transmitter'){qty=pNum('transmitter_qty',cfg.transmitter_qty,'1');rate=pNum('transmitter_rate',cfg.transmitter_rate,'0.01');}
    const optional=rule.startsWith('optional_');
    const enabled=rule==='optional_battery'?cfg.battery_enabled:rule==='optional_rsd'?cfg.rsd_enabled:rule==='optional_transmitter'?cfg.transmitter_enabled:true;
    return `<tr class="boq-project-row ${optional&&!enabled?'boq-row-disabled':''}"><td>${esc(row.item)}</td><td>${desc}</td><td>${esc(row.details||'')}</td><td>${esc(row.unit||'')}</td><td>${qty}</td><td>${rate}</td><td class="money">${boqMoney(row.total)}</td><td>${use}</td></tr>`;
  }
  function masterRowHtmlV39(row){
    const key=encodeURIComponent(row._master_key);
    return `<tr class="boq-master-row"><td>${esc(row.item||'')}</td><td>${esc(row.description||'')}</td><td>${esc(row.details||'')}</td><td>${esc(row.unit||'')}</td><td><input class="boq-master-input boq-cell-input" data-master-key="${key}" data-field="qty" type="number" step="0.01" value="${esc(row.qty)}"></td><td><input class="boq-master-input boq-cell-input" data-master-key="${key}" data-field="rate" type="number" step="0.01" value="${esc(row.rate)}"></td><td class="money">${boqMoney(row.total)}</td><td><span class="badge ${row.rule==='manual'?'warn':'ok'}">${esc(row.rule||'manual')}</span></td></tr>`;
  }
  function csvCell(v){const s=String(v??'');return '"'+s.replace(/"/g,'""')+'"';}
  function exportCsv(project,rows,total){
    const lines=[['Item','Description','Details','Unit','Qty','Rate','Total'].map(csvCell).join(',')];
    rows.forEach(r=>lines.push([r.item,r.description,r.details,r.unit,r.qty,r.rate,r.total].map(csvCell).join(',')));
    lines.push(['','','','','','Grand Total',total].map(csvCell).join(','));
    const blob=new Blob(['\uFEFF'+lines.join('\r\n')],{type:'text/csv;charset=utf-8;'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(String(project.name||'Solar_BOQ').replace(/[\\/:*?"<>|]+/g,'_'))+'_BOQ.csv';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
  }
  function printBoq(project,rows,total){
    const w=window.open('','_blank','width=1200,height=800');if(!w)return toast('Browser บล็อกหน้าต่าง Print');
    const trs=rows.map(r=>`<tr><td>${esc(r.item||'')}</td><td>${esc(r.description||'')}</td><td>${esc(r.details||'')}</td><td>${esc(r.unit||'')}</td><td>${boqMoney(r.qty)}</td><td>${boqMoney(r.rate)}</td><td>${boqMoney(r.total)}</td></tr>`).join('');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(project.name||'BOQ')}</title><style>body{font-family:Arial,"Tahoma",sans-serif;padding:24px}h2{margin:0 0 6px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #bbb;padding:6px;text-align:left}th{background:#eee}.total{font-size:18px;font-weight:bold;text-align:right;margin-top:12px}</style></head><body><h2>${esc(project.name||'Solar Project')} - BOQ</h2><table><thead><tr><th>Item</th><th>Description</th><th>Details</th><th>Unit</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead><tbody>${trs}</tbody></table><div class="total">Grand Total: ${boqMoney(total)}</div></body></html>`);w.document.close();setTimeout(()=>{w.focus();w.print()},300);
  }

  boqPage=async function(c){
    if(!reqProject())return;
    const b=await api(`/api/boq/${state.current.id}`),p=b.project||{};
    const cfg=boqLoadConfig(b);cfg.master_overrides=cfg.master_overrides||{};
    const largeSite=Number(p.dc_kwp||0)>200;
    const projectRows=projectRowsV39(b,cfg);
    const remaining=(b.rows||[]).filter(x=>String(x.category||'')!=='Equipment'&&!BOQ_HIDDEN_MASTER_ITEMS.has(String(x.item||'').trim())).map(x=>effectiveOverride(cfg,x));
    const allRows=[...projectRows,...remaining];
    const total=allRows.reduce((s,x)=>s+Number(x.total||0),0);
    c.innerHTML=`<div class="card"><div class="row boq-title-row"><div><h2 style="margin:0">Company BOQ</h2><small>Qty และ Rate แก้ได้ทุกแถว • บันทึกอัตโนมัติเมื่อออกจากช่อง</small></div><div class="toolbar"><button class="secondary" id="exportBoqCsv">Export Excel / CSV</button><button class="secondary" id="printBoq">Print / PDF</button><div class="boq-grand"><small>Grand Total</small><b>${boqMoney(total)}</b></div></div></div><div class="table-wrap boq-table-wrap"><table id="boqTable"><thead><tr><th>Item</th><th>Description</th><th>Details</th><th>Unit</th><th>Qty</th><th>Rate</th><th>Total</th><th>Use / Rule</th></tr></thead><tbody>${projectRows.map(x=>projectRowHtmlV39(x,cfg)).join('')}${remaining.map(masterRowHtmlV39).join('')}</tbody></table></div><div class="boq-footnote">${largeSite?'Project นี้ > 200 kWp จึงมี Rapid Shutdown / Transmitter เป็นตัวเลือก':'Project นี้ ≤ 200 kWp จึงไม่แสดง Rapid Shutdown / Transmitter'}</div></div>`;

    function saveFromTable(){
      const next={...cfg,master_overrides:{...(cfg.master_overrides||{})}};
      document.querySelectorAll('.boq-project-input').forEach(inp=>next[inp.dataset.key]=Number(inp.value||0));
      document.querySelectorAll('.boq-use-toggle').forEach(inp=>next[inp.dataset.key]=inp.checked);
      const comm=$('#boqCommInline');if(comm)next.communication_type=comm.value;
      const batt=$('#boqBatteryModelInline');if(batt)next.battery_model=batt.value.trim()||'Battery';
      document.querySelectorAll('.boq-master-input').forEach(inp=>{const k=decodeURIComponent(inp.dataset.masterKey),f=inp.dataset.field;next.master_overrides[k]=next.master_overrides[k]||{};next.master_overrides[k][f]=Number(inp.value||0);});
      boqSaveConfig(p.id,next);toast('บันทึก BOQ แล้ว');boqPage(c);
    }
    document.querySelectorAll('.boq-project-input,.boq-use-toggle,#boqCommInline,#boqBatteryModelInline,.boq-master-input').forEach(el=>el.addEventListener('change',saveFromTable));
    $('#exportBoqCsv').onclick=()=>exportCsv(p,allRows,total);
    $('#printBoq').onclick=()=>printBoq(p,allRows,total);
  };
})();
