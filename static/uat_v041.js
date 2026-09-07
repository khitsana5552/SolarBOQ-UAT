// UAT v0.4.1 - Verified Datasheet Database is the primary source for Smart Select
(function(){
  const VERIFIED_LIVE='https://raw.githubusercontent.com/khitsana5552/SolarBOQ-UAT/main/catalog/equipment_catalog.json';
  const VERIFIED_SNAPSHOT='/static/equipment_catalog_snapshot.json?v=0.4.1';

  function norm41(s){
    return String(s||'')
      .toLowerCase()
      .replace(/\(\s*\d+\s*v\s*\)/g,'')
      .replace(/[^a-z0-9]+/g,'');
  }
  function sameModel41(a,b){
    const x=norm41(a),y=norm41(b);
    return !!(x&&y&&(x===y||x.includes(y)||y.includes(x)));
  }
  async function loadVerified41(){
    // LIVE Verified Datasheet Database is always tried first.
    try{
      const r=await fetch(VERIFIED_LIVE+'?t='+Date.now(),{cache:'no-store'});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const j=await r.json();
      return {catalog:j,source:'Verified Datasheet Database (live)'};
    }catch(e){
      // Offline/local fallback is a bundled snapshot of the verified database.
      const r=await fetch(VERIFIED_SNAPSHOT,{cache:'no-store'});
      if(!r.ok)throw new Error('โหลด Verified Database ไม่สำเร็จทั้ง live และ local snapshot');
      return {catalog:await r.json(),source:'Verified Datasheet Database (offline snapshot)'};
    }
  }
  function candidates41(catalog,type){
    const out=[];
    for(const ds of (catalog?.datasheets||[])){
      if(ds.type!==type)continue;
      for(const v of (ds.variants||[]))out.push({ds,v});
    }
    return out;
  }
  function matchModule41(p,catalog){
    const model=String(p.module_model||''),power=Number(p.module_power_w||0);
    const arr=candidates41(catalog,'module').map(x=>{
      const exact=sameModel41(model,x.v.model);
      const diff=power>0?Math.abs(Number(x.v.power_w||0)-power):999999;
      let score=exact?100000:0;
      if(power>0&&diff<0.01)score+=10000;
      else if(power>0&&diff<=5)score+=Math.max(0,2000-diff*200);
      if(x.ds.preferred_variant===x.v.model)score+=250;
      return {...x,score,diff,exact};
    }).sort((a,b)=>b.score-a.score||a.diff-b.diff);
    const hit=arr[0];
    // Require exact model OR exact wattage. Do not silently choose unrelated panels.
    return hit&&(hit.exact||(power>0&&hit.diff<0.01))?hit:null;
  }
  function matchInverter41(p,catalog){
    const model=String(p.inverter_model||''),ac=Number(p.ac_kw||0);
    const arr=candidates41(catalog,'inverter').map(x=>{
      const exact=sameModel41(model,x.v.model);
      const diff=ac>0?Math.abs(Number(x.v.rated_ac_kw||0)-ac):999999;
      let score=exact?100000:0;
      if(ac>0&&diff<0.01)score+=10000;
      else if(ac>0&&diff<=5)score+=Math.max(0,2000-diff*200);
      return {...x,score,diff,exact};
    }).sort((a,b)=>b.score-a.score||a.diff-b.diff);
    const hit=arr[0];
    return hit&&(hit.exact||(ac>0&&hit.diff<0.01))?hit:null;
  }
  function variantPayload41(hit,type){
    const ds=hit.ds,v=hit.v;
    return {
      type,
      manufacturer:ds.manufacturer||'',
      model:v.model||'',
      revision:ds.revision||'',
      active:1,
      source_filename:ds.source_filename||'',
      source_file:'',
      notes:`Verified Datasheet Database ${ds.id} • Smart Select v0.4.1`,
      power_w:Number(v.power_w||0),vmp:Number(v.vmp||0),voc:Number(v.voc||0),imp:Number(v.imp||0),isc:Number(v.isc||0),
      temp_coeff_voc:Number(v.temp_coeff_voc||0),dimensions:v.dimensions||'',weight_kg:Number(v.weight_kg||0),
      rated_ac_kw:Number(v.rated_ac_kw||0),max_dc_v:Number(v.max_dc_v||0),mppt_min_v:Number(v.mppt_min_v||0),mppt_max_v:Number(v.mppt_max_v||0),
      num_mppt:Number(v.num_mppt||0),inputs_per_mppt:Number(v.inputs_per_mppt||0),max_current_mppt:Number(v.max_current_mppt||0),
      max_isc_mppt:Number(v.max_isc_mppt||0),rated_output_current:Number(v.rated_output_current||0),
      modules_per_rsd:Number(v.modules_per_rsd||0),max_input_v:Number(v.max_input_v||0),max_input_current:Number(v.max_input_current||0)
    };
  }
  async function upsertVerified41(hit,type){
    if(!hit)return null;
    const payload=variantPayload41(hit,type);
    const r=await api('/api/equipment/save',{
      method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({variants:[payload]})
    });
    if(!r.saved?.length){
      const msg=(r.errors||[]).join('; ')||'ไม่สามารถบันทึก Verified Equipment ลง Local Equipment ได้';
      throw new Error(msg);
    }
    return r.saved[0];
  }
  function ensureOption41(selId,item,type){
    if(!item)return;
    const sel=$(selId);if(!sel)return;
    let opt=sel.querySelector(`option[value="${item.id}"]`);
    if(!opt){
      opt=document.createElement('option');
      opt.value=String(item.id);
      opt.textContent=type==='module'
        ? `${item.manufacturer||''} ${item.model||''} (${fmt(item.power_w)} W)`
        : `${item.manufacturer||''} ${item.model||''}`;
      sel.appendChild(opt);
    }
    sel.value=String(item.id);
    sel.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function status41(html,ok=true){
    let box=$('#smartSelectStatus41');
    if(!box){
      const btn=$('#smartSel');if(!btn)return;
      box=document.createElement('div');
      box.id='smartSelectStatus41';
      box.style.marginTop='12px';box.style.padding='10px 12px';box.style.borderRadius='8px';box.style.lineHeight='1.55';
      btn.closest('.string-control-card,.card')?.appendChild(box);
    }
    box.className=ok?'badge-panel-ok':'bad';
    box.innerHTML=html;
  }

  const prevStringPage41=stringPage;
  stringPage=async function(c){
    await prevStringPage41(c);
    const btn=$('#smartSel');if(!btn)return;
    btn.onclick=async()=>{
      if(!state.current)return toast('เลือก Project ก่อน');
      btn.disabled=true;btn.textContent='Checking Verified Database...';
      try{
        await loadProjects(state.current.id);
        const p=state.current;
        const loaded=await loadVerified41();
        const modHit=matchModule41(p,loaded.catalog);
        const invHit=matchInverter41(p,loaded.catalog);

        // IMPORTANT: Verified Database wins over any existing/incomplete Local Equipment.
        const mod=modHit?await upsertVerified41(modHit,'module'):null;
        const inv=invHit?await upsertVerified41(invHit,'inverter'):null;

        state.equipment=await api('/api/equipment');
        const modSaved=mod?state.equipment.find(x=>x.id==mod.id)||mod:null;
        const invSaved=inv?state.equipment.find(x=>x.id==inv.id)||inv:null;
        ensureOption41('#modSel',modSaved,'module');
        ensureOption41('#invSel',invSaved,'inverter');

        const prMod=`${p.module_model||'-'}${Number(p.module_power_w||0)?` (${fmt(p.module_power_w)} W)`:''}`;
        const prInv=`${p.inverter_model||'-'}${Number(p.ac_kw||0)?` (${fmt(p.ac_kw)} kW AC)`:''}`;
        const modLine=modSaved?`<b>${esc(modSaved.model)}</b> • Vmp ${fmt(modSaved.vmp)} V • Voc ${fmt(modSaved.voc)} V`:'<b>ไม่พบใน Verified Database</b>';
        const invLine=invSaved?`<b>${esc(invSaved.model)}</b> • ${fmt(invSaved.rated_ac_kw)} kW • ${fmt(invSaved.num_mppt)} MPPT`:'<b>ไม่พบใน Verified Database</b>';
        status41(`<b>Source:</b> ${esc(loaded.source)}<br><b>PR Module:</b> ${esc(prMod)} → ${modLine}<br><b>PR Inverter:</b> ${esc(prInv)} → ${invLine}`,!!(modSaved&&invSaved));

        if(modSaved&&invSaved)toast('Smart Select: ดึง Module + Inverter จาก Verified Database แล้ว');
        else if(modSaved)toast('พบ Module ใน Verified Database แต่ไม่พบ Inverter');
        else if(invSaved)toast('พบ Inverter ใน Verified Database แต่ไม่พบ Module');
        else toast('ไม่พบ Module/Inverter ใน Verified Database');
      }catch(e){
        status41(`<b>Smart Select Error:</b> ${esc(e.message||e)}`,false);
        toast('Smart Select ไม่สำเร็จ');
      }finally{
        btn.disabled=false;btn.textContent='Smart Select from PR';
      }
    };
  };
})();
