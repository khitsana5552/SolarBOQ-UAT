// UAT v0.5.13 - Validate MPPT module-count warnings only after final Huawei terminal mapping
(function(){
  function model13(d){return String((d?.inverter?.model||'')+' '+(d?.project?.inverter_model||'')).toUpperCase();}
  function qty13(d){return Math.max(1,Number(d?.project?.inverter_qty||d?.inverter_qty||1));}
  function isMismatchWarning13(w){
    const t=String(w||'');
    return /^INV-?\d+\s+MPPT\d+\s+contains strings with different module counts/i.test(t) ||
           /^MPPT\d+\s+contains strings with different module counts/i.test(t) ||
           /has parallel strings with different module counts after manual terminal mapping/i.test(t);
  }
  function mappedFor13(d,invNo){
    const m=model13(d);
    if(m.includes('SUN2000-150K-MG0') && window.SolarBOQTerminal53?.mappedStrings){
      const ss=window.SolarBOQTerminal53.mappedStrings(d,invNo);
      const map=window.SolarBOQTerminal53?.map150||{};
      if(Array.isArray(ss)&&map[ss.length]) return {supported:true,strings:ss};
    }
    if(window.SolarBOQTerminal43?.applyPlan){
      const plan=window.SolarBOQTerminal43.applyPlan(d);
      if(plan?.supported){
        const ss=(d?.strings||[]).filter(s=>Number(s.inverter_no||1)===invNo);
        return {supported:true,strings:ss};
      }
    }
    return {supported:false,strings:(d?.strings||[]).filter(s=>Number(s.inverter_no||1)===invNo)};
  }
  function clean13(d){
    if(!d)return d;
    d.warnings=(Array.isArray(d.warnings)?d.warnings:[]).filter(w=>!isMismatchWarning13(w));
    const q=qty13(d);
    for(let invNo=1;invNo<=q;invNo++){
      const finalMap=mappedFor13(d,invNo);
      if(!finalMap.supported) continue;
      const groups={};
      finalMap.strings.forEach(s=>{
        const mppt=Number(s.mppt||0);
        if(!mppt)return;
        (groups[mppt]||(groups[mppt]=[])).push(s);
      });
      Object.entries(groups).forEach(([mppt,arr])=>{
        if(arr.length>1 && new Set(arr.map(s=>Number(s.modules||0))).size>1){
          d.warnings.push(`INV-${String(invNo).padStart(2,'0')} MPPT${mppt} has parallel strings with different module counts after final PV terminal mapping. Review string balancing before construction.`);
        }
      });
    }
    return d;
  }
  function syncWarningDom13(d){
    if(typeof document==='undefined')return;
    const bar=document.querySelector('#designOut .string-summary-bar');
    if(!bar)return;
    const old=document.querySelector('#designOut .diagram-warning');
    if(old)old.remove();
    if(!d?.warnings?.length)return;
    const box=document.createElement('div');
    box.className='diagram-warning';
    box.innerHTML='⚠ '+d.warnings.map(w=>String(w).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))).join('<br>');
    bar.insertAdjacentElement('afterend',box);
  }
  const prevDiagram=typeof diagramSvg==='function'?diagramSvg:null;
  if(prevDiagram){diagramSvg=function(d){clean13(d);return prevDiagram(d);};}
  const prevRender=typeof renderDesign==='function'?renderDesign:null;
  if(prevRender){
    renderDesign=function(){
      if(typeof state!=='undefined'&&state?.design)clean13(state.design);
      prevRender();
      if(typeof state!=='undefined'&&state?.design){clean13(state.design);syncWarningDom13(state.design);}
    };
  }
  window.SolarBOQFinalWarning513={clean:clean13};
})();