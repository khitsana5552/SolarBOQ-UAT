// Dynamic BOQ equipment section for UAT v0.3.5
// Keeps the legacy Company BOQ rows after the project-specific equipment block.

const BOQ_COMMUNICATION_OPTIONS = [
  'SmartLogger3000A00GL (LAN only)',
  'SmartLogger3000A01EU (LAN+4G)',
  'SmartDongle-WLAN-FE (SDongleA-05), AP+STA',
  'SmartDongleB-06-EU (4G)'
];

function boqCfgKey(projectId){ return `solarboq_boq_options_${projectId}`; }

function boqFindRow(rows, pred){ return (rows||[]).find(pred) || null; }

function boqExactInverterRate(rows, acKw){
  const ac = Number(acKw||0);
  const row = boqFindRow(rows, r => {
    if(!String(r.rule||'').startsWith('inv_')) return false;
    const n = Number(String(r.rule).split('_')[1]);
    return Math.abs(n-ac) < 0.5;
  });
  return row ? Number(row.rate||0) : 0;
}

function boqDefaultConfig(b){
  const p=b.project||{};
  const rows=b.rows||[];
  const battery=boqFindRow(rows,r=>String(r.description||'').toLowerCase().startsWith('battery'));
  const dongle=boqFindRow(rows,r=>String(r.description||'').trim()==='Smart Dongle');
  const rsd=boqFindRow(rows,r=>String(r.description||'').trim()==='Rapid Shutdown');
  const tx=boqFindRow(rows,r=>String(r.description||'').trim()==='Transmitter');
  const module=boqFindRow(rows,r=>r.rule==='module_qty');
  const largeSite=Number(p.dc_kwp||0)>200;
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
    rsd_enabled:largeSite,
    rsd_qty:0,
    rsd_rate:Number(rsd?.rate||0),
    transmitter_enabled:largeSite,
    transmitter_qty:1,
    transmitter_rate:Number(tx?.rate||0)
  };
}

function boqLoadConfig(b){
  const d=boqDefaultConfig(b);
  try{
    const raw=localStorage.getItem(boqCfgKey(b.project.id));
    if(!raw) return d;
    return {...d,...JSON.parse(raw)};
  }catch(e){ return d; }
}

function boqSaveConfig(projectId,cfg){
  localStorage.setItem(boqCfgKey(projectId),JSON.stringify(cfg));
}

function boqMoney(n){ return Number(n||0).toLocaleString(undefined,{maximumFractionDigits:2}); }
function boqRow(item,description,unit,qty,rate,rule,details=''){
  qty=Number(qty||0); rate=Number(rate||0);
  return {item,description,details,unit,qty,rate,total:qty*rate,rule};
}

function boqProjectEquipmentRows(b,cfg){
  const p=b.project||{};
  const rows=b.rows||[];
  const out=[];
  const moduleModel=String(p.module_model||'').trim();
  const modulePower=Number(p.module_power_w||0);
  const moduleDesc='Solar Module'+(moduleModel?` - ${moduleModel}`:'');
  const moduleDetails=modulePower?`${boqMoney(modulePower)} W`:'';
  out.push(boqRow('1',moduleDesc,'Panel',p.module_qty,cfg.module_rate,'project_module',moduleDetails));

  const invModel=String(p.inverter_model||'').trim();
  const invDesc='Inverter'+(invModel?` - ${invModel}`:(Number(p.ac_kw||0)?` - ${boqMoney(p.ac_kw)} kW`:''));
  out.push(boqRow('2',invDesc,'Set',p.inverter_qty,cfg.inverter_rate,'project_inverter',Number(p.ac_kw||0)?`${boqMoney(p.ac_kw)} kW AC`:''));

  let idx=3;
  if(cfg.battery_enabled){
    out.push(boqRow(String(idx++),cfg.battery_model||'Battery','Ea',cfg.battery_qty,cfg.battery_rate,'optional_battery'));
  }

  out.push(boqRow(String(idx++),cfg.communication_type,'Set',cfg.communication_qty,cfg.communication_rate,'communication_select'));

  if(Number(p.dc_kwp||0)>200){
    if(cfg.rsd_enabled) out.push(boqRow(String(idx++),'Rapid Shutdown','Set',cfg.rsd_qty,cfg.rsd_rate,'optional_rsd'));
    if(cfg.transmitter_enabled) out.push(boqRow(String(idx++),'Transmitter','Set',cfg.transmitter_qty,cfg.transmitter_rate,'optional_transmitter'));
  }
  return out;
}

function boqControlNumber(id,label,value,step='1'){
  return `<label>${esc(label)}<input id="${id}" type="number" step="${step}" value="${esc(value)}"></label>`;
}

boqPage = async function(c){
  if(!reqProject())return;
  const b=await api(`/api/boq/${state.current.id}`);
  const p=b.project||{};
  const cfg=boqLoadConfig(b);
  const largeSite=Number(p.dc_kwp||0)>200;
  const projectRows=boqProjectEquipmentRows(b,cfg);
  // Hide generic Equipment master rows; the project-specific block above replaces them.
  const remaining=(b.rows||[]).filter(x=>String(x.category||'')!=='Equipment');
  const allRows=[...projectRows,...remaining];
  const total=allRows.reduce((s,x)=>s+Number(x.total||0),0);

  c.innerHTML=`
    <div class="card">
      <div class="row"><div><h2 style="margin:0">Project Equipment Options</h2><small>รายการอุปกรณ์ด้านบนของ BOQ จะสร้างตาม Project นี้เท่านั้น ไม่แสดง Inverter รุ่นที่ไม่ได้ใช้</small></div><span class="badge ${largeSite?'warn':'ok'}">${largeSite?'DC > 200 kWp':'DC ≤ 200 kWp'}</span></div>
      <div class="form-grid" style="margin-top:14px">
        ${boqControlNumber('boqModuleRate','Solar Module Unit Rate',cfg.module_rate,'0.01')}
        ${boqControlNumber('boqInvRate','Inverter Unit Rate',cfg.inverter_rate,'0.01')}
        <label>Communication Device<select id="boqComm">${BOQ_COMMUNICATION_OPTIONS.map(x=>`<option ${x===cfg.communication_type?'selected':''}>${esc(x)}</option>`).join('')}</select></label>
        ${boqControlNumber('boqCommQty','Communication Qty',cfg.communication_qty,'1')}
        ${boqControlNumber('boqCommRate','Communication Unit Rate',cfg.communication_rate,'0.01')}
      </div>
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid #e3e9ee">
        <label style="display:flex;gap:8px;align-items:center"><input id="boqBatteryEnabled" type="checkbox" ${cfg.battery_enabled?'checked':''}> <b>Include Battery</b></label>
        <div id="boqBatteryFields" class="form-grid" style="margin-top:10px;${cfg.battery_enabled?'':'display:none'}">
          <label>Battery Model / Description<input id="boqBatteryModel" value="${esc(cfg.battery_model)}"></label>
          ${boqControlNumber('boqBatteryQty','Battery Qty',cfg.battery_qty,'1')}
          ${boqControlNumber('boqBatteryRate','Battery Unit Rate',cfg.battery_rate,'0.01')}
        </div>
      </div>
      ${largeSite?`<div style="margin-top:14px;padding-top:14px;border-top:1px solid #e3e9ee">
        <b>Project > 200 kWp</b><small style="display:block">Rapid Shutdown และ Transmitter แสดงเป็นตัวเลือกสำหรับ Project นี้</small>
        <div class="form-grid" style="margin-top:10px">
          <label style="display:flex;gap:8px;align-items:center"><input id="boqRsdEnabled" type="checkbox" ${cfg.rsd_enabled?'checked':''}> Include Rapid Shutdown</label>
          ${boqControlNumber('boqRsdQty','RSD Qty',cfg.rsd_qty,'1')}
          ${boqControlNumber('boqRsdRate','RSD Unit Rate',cfg.rsd_rate,'0.01')}
          <label style="display:flex;gap:8px;align-items:center"><input id="boqTxEnabled" type="checkbox" ${cfg.transmitter_enabled?'checked':''}> Include Transmitter</label>
          ${boqControlNumber('boqTxQty','Transmitter Qty',cfg.transmitter_qty,'1')}
          ${boqControlNumber('boqTxRate','Transmitter Unit Rate',cfg.transmitter_rate,'0.01')}
        </div>
      </div>`:`<p class="muted" style="margin-top:14px">DC Capacity ไม่เกิน 200 kWp → ไม่แสดง Rapid Shutdown / Transmitter ใน BOQ ตามกฎ UAT ปัจจุบัน</p>`}
      <div class="toolbar" style="margin-top:14px"><button id="saveBoqOptions">Apply BOQ Options</button></div>
    </div>
    <div class="card gap">
      <div class="row"><div><h2 style="margin:0">Company BOQ</h2><small>Solar Module / Inverter ระบุรุ่นจาก Project Data</small></div><div><small>Grand Total</small><b style="display:block;font-size:22px">${boqMoney(total)}</b></div></div>
      <div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>Item</th><th>Description</th><th>Details</th><th>Unit</th><th>Qty</th><th>Rate</th><th>Total</th><th>Rule</th></tr></thead><tbody>
      ${allRows.map(x=>`<tr><td>${esc(x.item||'')}</td><td><b>${esc(x.description||'')}</b></td><td>${esc(x.details||'')}</td><td>${esc(x.unit||'')}</td><td>${boqMoney(x.qty)}</td><td>${boqMoney(x.rate)}</td><td>${boqMoney(x.total)}</td><td><span class="badge ${String(x.rule||'').includes('optional')?'warn':'ok'}">${esc(x.rule||'manual')}</span></td></tr>`).join('')}
      </tbody></table></div>
    </div>`;

  $('#boqBatteryEnabled').onchange=()=>{$('#boqBatteryFields').style.display=$('#boqBatteryEnabled').checked?'grid':'none'};
  $('#saveBoqOptions').onclick=()=>{
    const next={...cfg,
      module_rate:Number($('#boqModuleRate').value||0),
      inverter_rate:Number($('#boqInvRate').value||0),
      battery_enabled:$('#boqBatteryEnabled').checked,
      battery_model:$('#boqBatteryModel')?.value?.trim()||cfg.battery_model,
      battery_qty:Number($('#boqBatteryQty')?.value||0),
      battery_rate:Number($('#boqBatteryRate')?.value||0),
      communication_type:$('#boqComm').value,
      communication_qty:Number($('#boqCommQty').value||0),
      communication_rate:Number($('#boqCommRate').value||0)
    };
    if(largeSite){
      next.rsd_enabled=$('#boqRsdEnabled').checked;
      next.rsd_qty=Number($('#boqRsdQty').value||0);
      next.rsd_rate=Number($('#boqRsdRate').value||0);
      next.transmitter_enabled=$('#boqTxEnabled').checked;
      next.transmitter_qty=Number($('#boqTxQty').value||0);
      next.transmitter_rate=Number($('#boqTxRate').value||0);
    }
    boqSaveConfig(p.id,next);
    toast('บันทึกตัวเลือก BOQ แล้ว');
    boqPage(c);
  };
};
