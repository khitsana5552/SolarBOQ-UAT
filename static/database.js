const VERIFIED_CATALOG_URL='https://raw.githubusercontent.com/khitsana5552/SolarBOQ-UAT/main/catalog/equipment_catalog.json';
const VERIFIED_OPTIMIZER_URL='https://raw.githubusercontent.com/khitsana5552/SolarBOQ-UAT/main/catalog/optimizer_catalog.json';

const _solarboqUpdateHeader=updateHeader;
updateHeader=function(){
  _solarboqUpdateHeader();
  if(state.page==='database'){
    $('#pageTitle').textContent='Datasheet Database';
    $('#projectSub').textContent='ฐาน Datasheet ที่ตรวจแล้ว + รายการ Equipment ในเครื่อง';
  }
};

const _solarboqRender=render;
render=async function(){
  if(state.page==='database'){
    let c=$('#content');
    try{return await databasePage(c)}catch(e){c.innerHTML=`<div class="card bad">${esc(e.message)}</div>`;return}
  }
  return _solarboqRender();
};

function catalogReady(v,type){
  if(type==='module')return Number(v.power_w)>0&&Number(v.vmp)>0&&Number(v.voc)>0&&Number(v.imp)>0&&Number(v.isc)>0;
  if(type==='inverter')return Number(v.rated_ac_kw)>0&&Number(v.max_dc_v)>0&&Number(v.mppt_min_v)>0&&Number(v.mppt_max_v)>0&&(Number(v.num_mppt)>0||Number(v.max_input_number)>0);
  if(type==='rsd')return Number(v.modules_per_rsd)>0&&Number(v.max_input_v)>0;
  if(type==='optimizer')return Number(v.rated_input_dc_w)>0&&Number(v.max_input_v)>0&&Number(v.mppt_min_v)>0&&Number(v.mppt_max_v)>0&&Number(v.max_isc_a)>0;
  return false;
}
function typeLabel(t){return t==='module'?'Solar Module':t==='inverter'?'Inverter':t==='rsd'?'Rapid Shutdown':t==='optimizer'?'Optimizer':t||'-'}
function variantPower(v,t){return t==='module'?(fmt(v.power_w)+' W'):t==='inverter'?(fmt(v.rated_ac_kw)+' kW'):t==='optimizer'?(fmt(v.rated_input_dc_w)+' W'):'-'}
function variantElectrical(v,t){
  if(t==='module')return `Vmp ${fmt(v.vmp)} V • Voc ${fmt(v.voc)} V • Imp ${fmt(v.imp)} A • Isc ${fmt(v.isc)} A`;
  if(t==='inverter'){
    let topology=Number(v.num_mppt)>0?`${fmt(v.num_mppt)} MPPT`:Number(v.max_input_number)>0?`${fmt(v.max_input_number)} DC inputs • Full optimizer`:'Topology N/A';
    return `Max DC ${fmt(v.max_dc_v)} V • Operating ${fmt(v.mppt_min_v)}-${fmt(v.mppt_max_v)} V • ${topology}`;
  }
  if(t==='rsd')return `${fmt(v.modules_per_rsd)} module/device • Max ${fmt(v.max_input_v)} V / ${fmt(v.max_input_current)} A`;
  if(t==='optimizer')return `Input ${fmt(v.rated_input_dc_w)} W • Max ${fmt(v.max_input_v)} V • MPPT ${fmt(v.mppt_min_v)}-${fmt(v.mppt_max_v)} V • Isc ${fmt(v.max_isc_a)} A • Output ${fmt(v.max_output_v)} V / ${fmt(v.max_output_current_a)} A`;
  return '-';
}

async function fetchCatalog(url){
  let r=await fetch(url+'?t='+Date.now(),{cache:'no-store'});
  if(!r.ok)throw new Error('HTTP '+r.status);
  return r.json();
}

async function getVerifiedCatalog(){
  const main=await fetchCatalog(VERIFIED_CATALOG_URL);
  let opt={datasheets:[],updated_at:''};
  try{opt=await fetchCatalog(VERIFIED_OPTIMIZER_URL)}catch(e){}
  const datasheets=[...(main.datasheets||[]),...(opt.datasheets||[])];
  const updated=[main.updated_at||'',opt.updated_at||''].sort().reverse()[0]||'';
  return {...main,datasheets,updated_at:updated};
}

async function databasePage(c){
  c.innerHTML='<div class="card">กำลังโหลด Datasheet Database...</div>';
  let local=[];try{local=await api('/api/equipment')}catch(e){}
  let catalog={datasheets:[],updated_at:'',notes:''},catalogError='';
  try{catalog=await getVerifiedCatalog()}catch(e){catalogError=e.message}
  state.verifiedCatalog=catalog;
  state.localDatabase=local;
  const dss=Array.isArray(catalog.datasheets)?catalog.datasheets:[];
  const counts={module:0,inverter:0,rsd:0,optimizer:0};dss.forEach(x=>{if(counts[x.type]!==undefined)counts[x.type]++});
  c.innerHTML=`
    <div class="grid cols4">
      <div class="card metric"><span>Verified Datasheets</span><b>${dss.length}</b></div>
      <div class="card metric"><span>Modules</span><b>${counts.module}</b></div>
      <div class="card metric"><span>Inverters</span><b>${counts.inverter}</b></div>
      <div class="card metric"><span>Optimizer</span><b>${counts.optimizer}</b></div>
      <div class="card metric"><span>Rapid Shutdown</span><b>${counts.rsd}</b></div>
    </div>
    <div class="card gap">
      <div class="row"><div><h2 style="margin:0">Verified Datasheet Database</h2><small>Datasheet หลักจะตรวจจากไฟล์ที่คุณอัปโหลดใน ChatGPT แล้วบันทึกสเปกไว้ที่ฐานนี้</small></div><button id="refreshDb">Refresh Database</button></div>
      ${catalogError?`<div class="bad" style="margin-top:12px">${esc(catalogError)} — Local Equipment ยังดูได้ด้านล่าง</div>`:''}
      <div class="toolbar" style="margin-top:14px">
        <input id="dbSearch" placeholder="ค้นหา Manufacturer / Model / ชื่อไฟล์ Datasheet">
        <select id="dbType"><option value="">All types</option><option value="module">Solar Module</option><option value="inverter">Inverter</option><option value="optimizer">Optimizer</option><option value="rsd">Rapid Shutdown</option></select>
      </div>
      <div id="verifiedRows"></div>
      <p class="muted">Updated: ${esc(catalog.updated_at||'-')} • PDF ต้นฉบับไม่ถูกเผยแพร่ใน GitHub; ฐานนี้เก็บเฉพาะสเปกที่ตรวจแล้วและชื่อไฟล์อ้างอิง</p>
    </div>
    <div class="card gap">
      <h2>Local Equipment on this PC</h2>
      <p class="muted">รายการที่เคย Import/Save ในเครื่องนี้ แยกจาก Verified Database ด้านบน</p>
      <div class="table-wrap"><table><thead><tr><th>Type</th><th>Manufacturer</th><th>Model</th><th>Source Datasheet</th><th>Key Data</th><th>Status</th></tr></thead><tbody>
        ${local.map(x=>`<tr><td>${esc(typeLabel(x.type))}</td><td>${esc(x.manufacturer)}</td><td>${esc(x.model)}</td><td>${esc(x.source_filename||'-')}</td><td>${esc(variantElectrical(x,x.type))}</td><td><span class="badge ${ready(x)?'ok':'warn'}">${ready(x)?'Ready':'Incomplete'}</span></td></tr>`).join('')||'<tr><td colspan="6" class="muted">ยังไม่มี Equipment ในเครื่อง</td></tr>'}
      </tbody></table></div>
    </div>`;
  $('#refreshDb').onclick=()=>databasePage(c);
  $('#dbSearch').oninput=renderVerifiedRows;
  $('#dbType').onchange=renderVerifiedRows;
  renderVerifiedRows();
}

function renderVerifiedRows(){
  let box=$('#verifiedRows');if(!box)return;
  let ds=(state.verifiedCatalog?.datasheets||[]),q=($('#dbSearch')?.value||'').trim().toLowerCase(),typ=$('#dbType')?.value||'';
  let rows=ds.filter(x=>{
    if(typ&&x.type!==typ)return false;
    if(!q)return true;
    let hay=[x.manufacturer,x.series,x.model_family,x.source_filename,x.revision,(x.variants||[]).map(v=>v.model).join(' ')].join(' ').toLowerCase();
    return hay.includes(q);
  });
  if(!rows.length){box.innerHTML=`<div class="empty" style="margin-top:14px">${ds.length?'ไม่พบรายการตามตัวกรอง':'ยังไม่มี Datasheet ที่ตรวจและบันทึกใน Verified Database — อัปโหลด Datasheet ในแชตนี้ได้เลย แล้วผมจะเพิ่มให้'}</div>`;return}
  box.innerHTML=`<div class="table-wrap" style="margin-top:14px"><table><thead><tr><th>Type</th><th>Manufacturer</th><th>Series / Model</th><th>Source PDF</th><th>Variants</th><th>Revision</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(x=>{
    let vs=x.variants||[],ok=x.verified===true||(vs.length&&vs.every(v=>catalogReady(v,x.type)));
    const action=x.type==='optimizer'?'<span class="badge ok">Database</span>':`<button class="secondary" onclick="useCatalogDatasheet('${esc(x.id)}')">Use on this PC</button>`;
    return `<tr><td>${esc(typeLabel(x.type))}</td><td>${esc(x.manufacturer||'-')}</td><td><b>${esc(x.series||x.model_family||vs[0]?.model||'-')}</b></td><td>${esc(x.source_filename||'-')}</td><td>${vs.length} ${x.type==='module'?'variant(s)':''}<small>${esc(vs.slice(0,5).map(v=>variantPower(v,x.type)).join(' / '))}${vs.length>5?' / ...':''}</small></td><td>${esc(x.revision||'-')}</td><td><span class="badge ${ok?'ok':'warn'}">${ok?'Verified':'Review'}</span></td><td><button onclick="viewCatalogDatasheet('${esc(x.id)}')">View</button> ${action}</td></tr>`
  }).join('')}</tbody></table></div>`;
}

window.viewCatalogDatasheet=function(id){
  let x=(state.verifiedCatalog?.datasheets||[]).find(d=>String(d.id)===String(id));if(!x)return;
  let vs=x.variants||[];
  openModal('Datasheet: '+(x.manufacturer||'')+' '+(x.series||x.model_family||''),`
    <div class="summary"><div><small>Type</small><b>${esc(typeLabel(x.type))}</b></div><div><small>Source PDF</small><b>${esc(x.source_filename||'-')}</b></div><div><small>Revision</small><b>${esc(x.revision||'-')}</b></div><div><small>Verified</small><b>${esc(x.verified_at||'-')}</b></div></div>
    <div class="table-wrap" style="margin-top:16px"><table><thead><tr><th>Model</th><th>Power</th><th>Electrical / Limits</th><th>Status</th></tr></thead><tbody>${vs.map(v=>`<tr><td><b>${esc(v.model||'-')}</b></td><td>${esc(variantPower(v,x.type))}</td><td>${esc(variantElectrical(v,x.type))}</td><td><span class="badge ${(x.verified===true||catalogReady(v,x.type))?'ok':'warn'}">${(x.verified===true||catalogReady(v,x.type))?'Verified':'Review'}</span></td></tr>`).join('')}</tbody></table></div>
    ${x.notes?`<p class="muted">${esc(x.notes)}</p>`:''}
  `);
};

window.useCatalogDatasheet=async function(id){
  let x=(state.verifiedCatalog?.datasheets||[]).find(d=>String(d.id)===String(id));if(!x)return;
  if(x.type==='optimizer')return toast('Optimizer เก็บใน Verified Database แล้ว; String/Optimizer logic จะเชื่อมในขั้นถัดไป');
  if(!(x.variants||[]).length)return toast('Datasheet นี้ยังไม่มี Variant');
  let variants=x.variants.map(v=>({
    type:x.type,manufacturer:x.manufacturer||'',model:v.model||x.series||x.model_family||'',revision:x.revision||'',
    power_w:Number(v.power_w||0),vmp:Number(v.vmp||0),voc:Number(v.voc||0),imp:Number(v.imp||0),isc:Number(v.isc||0),temp_coeff_voc:Number(v.temp_coeff_voc||0),dimensions:v.dimensions||'',weight_kg:Number(v.weight_kg||0),
    rated_ac_kw:Number(v.rated_ac_kw||0),max_dc_v:Number(v.max_dc_v||0),mppt_min_v:Number(v.mppt_min_v||0),mppt_max_v:Number(v.mppt_max_v||0),num_mppt:Number(v.num_mppt||0),inputs_per_mppt:Number(v.inputs_per_mppt||0),max_current_mppt:Number(v.max_current_mppt||0),max_isc_mppt:Number(v.max_isc_mppt||0),rated_output_current:Number(v.rated_output_current||0),
    modules_per_rsd:Number(v.modules_per_rsd||0),max_input_v:Number(v.max_input_v||0),max_input_current:Number(v.max_input_current||0),source_filename:x.source_filename||'',source_file:'',notes:`Verified catalog ${id}${x.notes?' • '+x.notes:''}${v.full_optimizer_configuration?' • Full optimizer inverter: use special string logic':''}`,active:1
  }));
  let r=await api('/api/equipment/save',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({variants})});
  toast(`เพิ่ม ${r.saved?.length||0} รายการเข้า Equipment Library แล้ว`);
  await databasePage($('#content'));
};
