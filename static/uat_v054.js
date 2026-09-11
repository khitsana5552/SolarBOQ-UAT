// UAT v0.5.4 - Remove stale generic MPPT mismatch warnings after exact manual terminal mapping
// The backend may warn from its temporary generic MPPT allocator before uat_v043 applies
// Huawei's exact PV terminal map. After the manual map is applied, discard those stale warnings
// and keep only mismatch warnings recomputed from the final mapped MPPT groups.
(function(){
  function clean54(d){
    if(!d)return;
    const plan=window.SolarBOQTerminal43?.applyPlan?window.SolarBOQTerminal43.applyPlan(d):d?.terminal_plan;
    if(!plan?.supported)return;
    d.warnings=(Array.isArray(d.warnings)?d.warnings:[]).filter(w=>{
      const t=String(w||'');
      return !/^INV-?\d+\s+MPPT\d+\s+contains strings with different module counts/i.test(t) &&
             !/^MPPT\d+\s+contains strings with different module counts/i.test(t);
    });
    // Re-check the FINAL manual terminal allocation only.
    const groups={};
    (d.strings||[]).forEach(s=>{if(!s.mppt)return;(groups[s.mppt]||(groups[s.mppt]=[])).push(s);});
    Object.entries(groups).forEach(([m,arr])=>{
      if(arr.length>1&&new Set(arr.map(x=>Number(x.modules))).size>1){
        d.warnings.push(`MPPT${m} has parallel strings with different module counts after manual terminal mapping. Review string balancing before construction.`);
      }
    });
  }

  const prevDiagram54=typeof diagramSvg==='function'?diagramSvg:null;
  if(prevDiagram54){diagramSvg=function(d){clean54(d);return prevDiagram54(d);};}

  const prevRender54=typeof renderDesign==='function'?renderDesign:null;
  if(prevRender54){renderDesign=function(){if(typeof state!=='undefined'&&state?.design)clean54(state.design);prevRender54();};}

  window.SolarBOQWarningFix54={clean:clean54};
})();
