// UAT v0.4.0 - deterministic Smart Select tested against the Auto Technic Aurora PR
(function(){
  const SNAPSHOT_URL='/static/equipment_catalog_snapshot.json?v=0.4.0';
  function norm40(s){return String(s||'').toLowerCase().replace(/\(\s*\d+\s*v\s*\)/g,'').replace(/[^a-z0-9]+/g,'');}
  function sameModel40(a,b){const x=norm40(a),y=norm40(b);return !!(x&&y&&(x===y||x.includes(y)||y.includes(x)));}
  async function smartCatalog40(){
    try{
      const r=await fetch(SNAPSHOT_URL,{cache:'no-store'});
      if(!r.ok)throw new Error('HTTP '+r.status);
      return await r.json();
    }catch(e){
      // Remote verified catalog remains a secondary fallback when available.
      try{return await getVerifiedCatalog()}catch(_){return {datasheets:[]}}
    }
  }
  function catalogCandidates40(catalog,type){
    const out=[];
    for(const ds of (catalog?.datasheets||[])){
      if(ds.type!==type)continue;
      for(const v of (ds.variants||[]))out.push({ds,v});
    }
    return out;
  }
  function chooseCatalogModule40(project,catalog){
    const model=String(project.module_model||''),power=Number(project.module_power_w||0);
    const a=catalogCandidates40(catalog,'module').map(x=>{
      let score=0;
      if(sameModel40(model,x.v.model))score+=10000;
      const diff=power>0?Math.abs(Number(x.v.power_w||0)-power):99999;
      if(power>0&&diff<0.01)score+=3000;else if(power>0&&diff<=5)score+=Math.max(0,1000-diff*100);
      if(x.ds.preferred_variant===x.v.model)score+=200;
      return {...x,score,diff};
    }).sort((a,b)=>b.score-a.score||a.diff-b.diff);
    return a[0]&&a[0].score>=3000?a[0]:null;
  }
  function chooseCatalogInverter40(project,catalog){
    const model=String(project.inverter_model||''),ac=Number(project.ac_kw||0);
    const a=catalogCandidates40(catalog,'inverter').map(x=>{
      let score=0;
      if(sameModel40(model,x.v.model))score+=10000;
      const diff=ac>0?Math.abs(Number(x.v.rated_ac_kw||0)-ac):99999;
      if(ac>0&&diff<0.01)score+=3000;else if(ac>0&&diff<=5)score+=Math.max(0,1000-diff*100);
      return {...x,score,diff};
    }).sort((a,b)=>b.score-a.score||a.diff-b.diff);
    return a[0]&&a[0].score>=3000?a[0]:null;
  }
  function chooseLocal40(project,equipment,type){
    const list=(equipment||[]).filter(x=>x.type===type);
    const desired=type==='module'?project.module_model:project.inverter_model;
    const size=type==='module'?Number(project.module_power_w||0):Number(project.ac_kw||0);
    let exact=list.find(x=>sameModel40(desired,x.model));
    if(exact)return exact;
    if(size>0){
      const key=type==='module'?'power_w':'rated_ac_kw';
      const sized=list.filter(x=>Math.abs(Number(x[key]||0)-size)<0.01);
      if(sized.length===1)return sized[0];
    }
    return null;
  }
  async function installCatalogVariant40(hit,type){
    if(!hit)return null;
    const ds=hit.ds,v=hit.v;
    const variant={
      type,manufacturer:ds.manufacturer||'',model:v.model||'',revision:ds.revision||'',active:1,
      source_filename:ds.source_filename||'',source_file:'',notes:`Verified catalog ${ds.id} • Smart Select v0.4.0`,
      power_w:Number(v.power_w||0),vmp:Number(v.vmp||0),voc:Number(v.voc||0),imp:Number(v.imp||0),isc:Number(v.isc||0),temp_coeff_voc:Number(v.temp_coeff_voc||0),dimensions:v.dimensions||'',weight_kg:Number(v.weight_kg||0),
      rated_ac_kw:Number(v.rated_ac_kw||0),max_dc_v:Number(v.max_dc_v||0),mppt_min_v:Number(v.mppt_min_v||0),mppt_max_v:Number(v.mppt_max_v||0),num_mppt:Number(v.num_mppt||0),inputs_per_mppt:Number(v.inputs_per_mppt||0),max_current_mppt:Number(v.max_current_mppt||0),max_isc_mppt:Number(v.max_isc_mppt||0),rated_output_current:Number(v.rated_output_current||0),
      modules_per_rsd:0,max_input_v:0,max_input_current:0
    };
    const r=await api('/api/equipment/save',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({variants:[variant]})});
    return r.saved?.[0]||null;
  }
  function ensureOption40(selId,item,type){
    if(!item)return;
    const sel=$(selId);if(!sel)return;
    let opt=sel.querySelector(`option[value="${item.id}"]`);
    if(!opt){
      opt=document.createElement('option');opt.value=String(item.id);
      opt.textContent=type==='module'?`${item.manufacturer||''} ${item.model||''} (${fmt(item.power_w)} W)`: `${item.manufacturer||''} ${item.model||''}`;
      sel.appendChild(opt);
    }
    sel.value=String(item.id);
  }
  function setSmartStatus40(html,ok=true){
    let box=$('#smartSelectStatus40');
    if(!box){
      const btn=$('#smartSel');if(!btn)return;
      box=document.createElement('div');box.id='smartSelectStatus40';box.style.marginTop='10px';box.style.fontSize='13px';
      btn.closest('.string-control-card,.card')?.appendChild(box);
    }
    box.className=ok?'muted':'bad';box.innerHTML=html;
  }

  const previousStringPage40=stringPage;
  stringPage=async function(c){
    await previousStringPage40(c);
    const btn=$('#smartSel');if(!btn)return;
    btn.onclick=async()=>{
      if(!state.current)return toast('เลือก Project ก่อน');
      btn.disabled=true;btn.textContent='Selecting...';
      try{
        // Refresh project data so Smart Select always uses the latest PR import values.
        await loadProjects(state.current.id);
        const p=state.current;
        state.equipment=await api('/api/equipment');
        const catalog=await smartCatalog40();

        let mod=chooseLocal40(p,state.equipment,'module');
        if(!mod){
          const hit=chooseCatalogModule40(p,catalog);
          mod=await installCatalogVariant40(hit,'module');
        }
        let inv=chooseLocal40(p,state.equipment,'inverter');
        if(!inv){
          const hit=chooseCatalogInverter40(p,catalog);
          inv=await installCatalogVariant40(hit,'inverter');
        }
        state.equipment=await api('/api/equipment');
        if(mod)mod=state.equipment.find(x=>x.id==mod.id)||chooseLocal40(p,state.equipment,'module');
        if(inv)inv=state.equipment.find(x=>x.id==inv.id)||chooseLocal40(p,state.equipment,'inverter');
        ensureOption40('#modSel',mod,'module');
        ensureOption40('#invSel',inv,'inverter');

        const prModule=`${p.module_model||'-'}${Number(p.module_power_w||0)?` (${fmt(p.module_power_w)} W)`:''}`;
        const prInv=`${p.inverter_model||'-'}${Number(p.ac_kw||0)?` (${fmt(p.ac_kw)} kW AC)`:''}`;
        if(mod&&inv){
          setSmartStatus40(`PR Module: <b>${esc(prModule)}</b> → <b>${esc(mod.model)}</b><br>PR Inverter: <b>${esc(prInv)}</b> → <b>${esc(inv.model)}</b>`,true);
          toast('Smart Select เลือก Module + Inverter แล้ว');
        }else{
          setSmartStatus40(`PR Module: <b>${esc(prModule)}</b> → ${mod?`<b>${esc(mod.model)}</b>`:'ไม่พบ'}<br>PR Inverter: <b>${esc(prInv)}</b> → ${inv?`<b>${esc(inv.model)}</b>`:'ไม่พบ'}`,false);
          toast(mod?'พบ Module แต่ยังไม่พบ Inverter':inv?'พบ Inverter แต่ยังไม่พบ Module':'ไม่พบอุปกรณ์ที่ตรง PR');
        }
      }catch(e){
        setSmartStatus40(`Smart Select error: ${esc(e.message||e)}`,false);
        toast('Smart Select ไม่สำเร็จ');
      }finally{btn.disabled=false;btn.textContent='Smart Select from PR';}
    };
  };
})();
