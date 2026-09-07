// Inline-editable project BOQ equipment rows for UAT v0.3.6

const BOQ_COMMUNICATION_OPTIONS = [
  'SmartLogger3000A00GL (LAN only)',
  'SmartLogger3000A01EU (LAN+4G)',
  'SmartDongle-WLAN-FE (SDongleA-05), AP+STA',
  'SmartDongleB-06-EU (4G)'
];

function boqCfgKey(projectId){ return `solarboq_boq_options_${projectId}`; }
function boqFindRow(rows,pred){ return (rows||[]).find(pred)||null; }
function boqExactInverterRate(rows,acKw){
  const ac=Number(acKw||0);
  const row=boqFindRow(rows,r=>String(r.rule||'').startsWith('inv_')&&Math.abs(Number(String(r.rule).split('_')[1])-ac)<0.5);
  return row?Number(row.rate||0):0;
}
function boqDefaultConfig(b){
  const p=b.project||{}, rows=b.rows||[];
  const battery=boqFindRow(rows,r=>String(r.description||'').toLowerCase().startsWith('battery'));
  const dongle=boqFindRow(rows,r=>String(r.description||'').trim()==='Smart Dongle');
  const rsd=boqFindRow(rows,r=>String(r.description||'').trim()==='Rapid Shutdown');
  const tx=boqFindRow(rows,r=>String(r.description||'').trim()==='Transmitter');
  const module=boqFindRow(rows,r=>r.rule==='module_qty');
  return {
    module_rate:Number(module?.rate||0),
    inverter_rate:boqExactInverterRate(rows,p.ac_kw),
    battery_enabled:false,
    battery_model:battery?.description||'Battery',
    battery_qty:1,
    battery_rate:Number(battery?.rate||0),
    communication_type:BOQ_COMMUNICATION_OPTIONS[2],
    communication_qty:1,
    communication_rate:Number(dongle?.rate||0),
    rsd_enabled:false,
    rsd_qty:0,
    rsd_rate:Number(rsd?.rate||0),
    transmitter_enabled:false,
    transmitter_qty:1,
    transmitter_rate:Number(tx?.rate||0)
  };
}
function boqLoadConfig(b){
  const d=boqDefaultConfig(b);
  try{const raw=localStorage.getItem(boqCfgKey(b.project.id));return raw?{...d,...JSON.parse(raw)}:d}catch(e){return d}
}
function boqSaveConfig(projectId,cfg){localStorage.setItem(boqCfgKey(projectId),JSON.stringify(cfg));}
function boqMoney(n){return Number(n||0).toLocaleString(undefined,{maximumFractionDigits:2});}
function boqRow(item,description,unit,qty,rate,rule,details=''){qty=Number(qty||0);rate=Number(rate||0);return {item,description,details,unit,qty,rate,total:qty*rate,rule};}

function boqProjectRows(b,cfg){
  const p=b.project||{}, out=[];
  const moduleModel=String(p.module_model||'').trim();
  out.push(boqRow('1','Solar Module'+(moduleModel?` - ${moduleModel}`:''),'Panel',p.module_qty,cfg.module_rate,'project_module',Number(p.module_power_w||0)?`${boqMoney(p.module_power_w)} W`:''));
  const invModel=String(p.inverter_model||'').trim();
  out.push(boqRow('2','Inverter'+(invModel?` - ${invModel}`:(Number(p.ac_kw||0)?` - ${boqMoney(p.ac_kw)} kW`:'')),'Set',p.inverter_qty,cfg.inverter_rate,'project_inverter',Number(p.ac_kw||0)?`${boqMoney(p.ac_kw)} kW AC`:''));
  out.push(boqRow('3',cfg.battery_model||'Battery','Ea',cfg.battery_enabled?cfg.battery_qty:0,cfg.battery_rate,'optional_battery'));
  out.push(boqRow('4',cfg.communication_type,'Set',cfg.communication_qty,cfg.communication_rate,'communication_select'));
  if(Number(p.dc_kwp||0)>200){
    out.push(boqRow('5','Rapid Shutdown','Set',cfg.rsd_enabled?cfg.rsd_qty:0,cfg.rsd_rate,'optional_rsd'));
    out.push(boqRow('6','Transmitter','Set',cfg.transmitter_enabled?cfg.transmitter_qty:0,cfg.transmitter_rate,'optional_transmitter'));
  }
  return out;
}

function boqNumInput(cls,key,value,step='1'){return `<input class="boq-cell-input ${cls}" data-key="${key}" type="number" step="${step}" value="${esc(value)}">`;}
function boqUseToggle(key,checked,label='Use'){return `<label class="boq-use"><input class="boq-use-toggle" data-key="${key}" type="checkbox" ${checked?'checked':''}><span>${label}</span></label>`;}

function boqEquipmentRowHtml(row,cfg){
  const rule=String(row.rule||'');
  let use='';
  if(rule==='optional_battery') use=boqUseToggle('battery_enabled',cfg.battery_enabled,'Include');
  if(rule==='optional_rsd') use=boqUseToggle('rsd_enabled',cfg.rsd_enabled,'Include');
  if(rule==='optional_transmitter') use=boqUseToggle('transmitter_enabled',cfg.transmitter_enabled,'Include');
  if(rule==='project_module'||rule==='project_inverter'||rule==='communication_select') use='<span class="badge ok">Required</span>';

  let description=`<b>${esc(row.description)}</b>`;
  if(rule==='communication_select') description=`<select class="boq-inline-select" id="boqCommInline">${BOQ_COMMUNICATION_OPTIONS.map(x=>`<option ${x===cfg.communication_type?'selected':''}>${esc(x)}</option>`).join('')}</select>`;
  if(rule==='optional_battery') description=`<input class="boq-desc-input" id="boqBatteryModelInline" value="${esc(cfg.battery_model||'Battery')}">`;

  let qty=row.qty,rate=row.rate;
  if(rule==='project_module'){
    qty=`<span class="boq-auto-value">${boqMoney(row.qty)}</span>`;
    rate=boqNumInput('','module_rate',cfg.module_rate,'0.01');
  }else if(rule==='project_inverter'){
    qty=`<span class="boq-auto-value">${boqMoney(row.qty)}</span>`;
    rate=boqNumInput('','inverter_rate',cfg.inverter_rate,'0.01');
  }else if(rule==='communication_select'){
    qty=boqNumInput('','communication_qty',cfg.communication_qty,'1');
    rate=boqNumInput('','communication_rate',cfg.communication_rate,'0.01');
  }else if(rule==='optional_battery'){
    qty=boqNumInput('','battery_qty',cfg.battery_qty,'1');
    rate=boqNumInput('','battery_rate',cfg.battery_rate,'0.01');
  }else if(rule==='optional_rsd'){
    qty=boqNumInput('','rsd_qty',cfg.rsd_qty,'1');
    rate=boqNumInput('','rsd_rate',cfg.rsd_rate,'0.01');
  }else if(rule==='optional_transmitter'){
    qty=boqNumInput('','transmitter_qty',cfg.transmitter_qty,'1');
    rate=boqNumInput('','transmitter_rate',cfg.transmitter_rate,'0.01');
  }
  const optional=rule.startsWith('optional_');
  const enabled=rule==='optional_battery'?cfg.battery_enabled:rule==='optional_rsd'?cfg.rsd_enabled:rule==='optional_transmitter'?cfg.transmitter_enabled:true;
  return `<tr class="boq-project-row ${optional&&!enabled?'boq-row-disabled':''}" data-rule="${esc(rule)}"><td>${esc(row.item)}</td><td>${description}</td><td>${esc(row.details||'')}</td><td>${esc(row.unit||'')}</td><td>${qty}</td><td>${rate}</td><td class="money boq-line-total">${boqMoney(row.total)}</td><td>${use}</td></tr>`;
}

boqPage=async function(c){
  if(!reqProject())return;
  const b=await api(`/api/boq/${state.current.id}`), p=b.project||{}, cfg=boqLoadConfig(b), largeSite=Number(p.dc_kwp||0)>200;
  const projectRows=boqProjectRows(b,cfg);
  const remaining=(b.rows||[]).filter(x=>String(x.category||'')!=='Equipment');
  const allRows=[...projectRows,...remaining];
  const total=allRows.reduce((s,x)=>s+Number(x.total||0),0);

  c.innerHTML=`<div class="card">
    <div class="row boq-title-row"><div><h2 style="margin:0">Company BOQ</h2><small>แก้ Qty / Rate และตัวเลือกอุปกรณ์ในตารางได้โดยตรง • บันทึกอัตโนมัติเมื่อออกจากช่อง</small></div><div class="boq-grand"><small>Grand Total</small><b>${boqMoney(total)}</b></div></div>
    <div class="table-wrap boq-table-wrap"><table id="boqTable"><thead><tr><th>Item</th><th>Description</th><th>Details</th><th>Unit</th><th>Qty</th><th>Rate</th><th>Total</th><th>Use / Rule</th></tr></thead><tbody>
      ${projectRows.map(x=>boqEquipmentRowHtml(x,cfg)).join('')}
      ${remaining.map(x=>`<tr><td>${esc(x.item||'')}</td><td>${esc(x.description||'')}</td><td>${esc(x.details||'')}</td><td>${esc(x.unit||'')}</td><td class="money">${boqMoney(x.qty)}</td><td class="money">${boqMoney(x.rate)}</td><td class="money">${boqMoney(x.total)}</td><td><span class="badge ${x.rule==='manual'?'warn':'ok'}">${esc(x.rule||'manual')}</span></td></tr>`).join('')}
    </tbody></table></div>
    <div class="boq-footnote">${largeSite?'Project นี้ > 200 kWp จึงมี Rapid Shutdown / Transmitter เป็นตัวเลือกในตาราง':'Project นี้ ≤ 200 kWp จึงไม่แสดง Rapid Shutdown / Transmitter'}</div>
  </div>`;

  function saveFromTable(){
    const next={...cfg};
    document.querySelectorAll('.boq-cell-input').forEach(inp=>next[inp.dataset.key]=Number(inp.value||0));
    document.querySelectorAll('.boq-use-toggle').forEach(inp=>next[inp.dataset.key]=inp.checked);
    const comm=$('#boqCommInline');if(comm)next.communication_type=comm.value;
    const batt=$('#boqBatteryModelInline');if(batt)next.battery_model=batt.value.trim()||'Battery';
    boqSaveConfig(p.id,next);toast('บันทึก BOQ แล้ว');boqPage(c);
  }
  document.querySelectorAll('.boq-cell-input,.boq-use-toggle,#boqCommInline,#boqBatteryModelInline').forEach(el=>el.addEventListener('change',saveFromTable));
};
