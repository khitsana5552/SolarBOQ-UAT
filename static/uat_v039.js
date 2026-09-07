// UAT v0.3.9 - Smart Select from PR can auto-add a verified module into Local Equipment
(function(){
  // The latest user upload is the same verified AIKO Comet 2U 640-670 W family.
  // Keep one datasheet record, but show the newest source file and keep 650 W preferred.
  if(typeof getVerifiedCatalog==='function'){
    const baseGetVerifiedCatalog=getVerifiedCatalog;
    getVerifiedCatalog=async function(){
      const c=await baseGetVerifiedCatalog();
      const ds=(c?.datasheets||[]).find(x=>x.id==='aiko-comet-2u-g-mch72mw-640-670');
      if(ds){
        ds.source_filename='AIKO 650 Comet-2U_192.5-AIKO-G-MCH72Mw-640-670W_2382x1134x30mm_DSDr_EN(3).pdf';
        ds.verified_at='2026-09-07T09:03:00Z';
        ds.preferred_variant='AIKO-G650-MCH72Mw';
        ds.notes='Verified from the latest user-supplied AIKO Comet 2U 640-670 W datasheet. Preferred working variant: AIKO-G650-MCH72Mw (650 W).';
      }
      return c;
    };
  }

  function n39(s){return ''.concat(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'');}
  function manufacturerHint(projectModel,manufacturer){
    const pm=n39(projectModel),m=n39(manufacturer);return !!(pm&&m&&(pm.includes(m)||m.includes(pm.slice(0,Math.min(pm.length,8)))));
  }
  function bestCatalogModule(project,catalog){
    const desiredModel=String(project.module_model||''),desiredPower=Number(project.module_power_w||0),all=[];
    for(const ds of (catalog?.datasheets||[])){
      if(ds.type!=='module')continue;
      for(const v of (ds.variants||[])){
        let score=0;const vm=n39(v.model),pm=n39(desiredModel);
        if(pm&&vm&&(pm.includes(vm)||vm.includes(pm)))score+=1200;
        if(manufacturerHint(desiredModel,ds.manufacturer))score+=260;
        const diff=desiredPower>0?Math.abs(Number(v.power_w||0)-desiredPower):9999;
        if(desiredPower>0&&diff<0.1)score+=500;else if(desiredPower>0&&diff<=5)score+=Math.max(0,200-diff*20);
        if(ds.preferred_variant&&String(ds.preferred_variant)===String(v.model))score+=40;
        all.push({ds,v,score,diff});
      }
    }
    all.sort((a,b)=>b.score-a.score||a.diff-b.diff);
    return all.length&&all[0].score>=450?all[0]:null;
  }
  async function ensureCatalogModule(project){
    if(typeof getVerifiedCatalog!=='function')return null;
    let catalog;try{catalog=await getVerifiedCatalog()}catch(e){return null;}
    const hit=bestCatalogModule(project,catalog);if(!hit)return null;
    const ds=hit.ds,v=hit.v;
    const existing=(state.equipment||[]).find(x=>x.type==='module'&&n39(x.model)===n39(v.model)&&n39(x.manufacturer)===n39(ds.manufacturer));
    if(existing)return existing;
    const variant={type:'module',manufacturer:ds.manufacturer||'',model:v.model||'',revision:ds.revision||'',power_w:Number(v.power_w||0),vmp:Number(v.vmp||0),voc:Number(v.voc||0),imp:Number(v.imp||0),isc:Number(v.isc||0),temp_coeff_voc:Number(v.temp_coeff_voc||0),dimensions:v.dimensions||'',weight_kg:Number(v.weight_kg||0),source_filename:ds.source_filename||'',source_file:'',notes:`Verified catalog ${ds.id} • Auto-added by Smart Select from PR`,active:1};
    const r=await api('/api/equipment/save',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({variants:[variant]})});
    return r.saved?.[0]||null;
  }

  const prevStringPage=stringPage;
  stringPage=async function(c){
    await prevStringPage(c);
    const btn=$('#smartSel');if(!btn)return;
    btn.onclick=async()=>{
      if(!state.current)return toast('เลือก Project ก่อน');
      btn.disabled=true;
      try{
        state.equipment=await api('/api/equipment');
        const suggested=await api(`/api/projects/${state.current.id}/suggest-equipment`);
        let mod=await ensureCatalogModule(state.current);
        if(!mod)mod=suggested.module||null;
        const inv=suggested.inverter||null;
        if(mod){
          let opt=$(`#modSel option[value="${mod.id}"]`);
          if(!opt){opt=document.createElement('option');opt.value=mod.id;opt.textContent=`${mod.manufacturer||''} ${mod.model||''} (${fmt(mod.power_w)} W)`;$('#modSel').appendChild(opt);}
          $('#modSel').value=String(mod.id);
        }
        if(inv&&$(`#invSel option[value="${inv.id}"]`))$('#invSel').value=String(inv.id);
        if(mod&&inv)toast(`Smart Select: ${mod.model} + ${inv.model}`);
        else if(mod)toast(`Smart Select: เลือกแผง ${mod.model} แล้ว • ยังไม่พบ Inverter ที่ตรง PR`);
        else if(inv)toast(`Smart Select: เลือก Inverter ${inv.model} แล้ว • ยังไม่พบแผงที่ตรง PR`);
        else toast('ยังไม่พบ Equipment ที่ตรงกับ PR');
      }catch(e){toast('Smart Select ไม่สำเร็จ: '+(e.message||e));}
      finally{btn.disabled=false;}
    };
  };
})();
