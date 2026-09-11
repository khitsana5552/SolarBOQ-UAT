// UAT v0.5.1 - Reliable click navigation for inverter overview cards
// Fix: inverter cards in the SVG now have explicit click handlers + delegated fallback.
(function(){
  function patchSvg51(svg){
    let out=String(svg||'');
    out=out.replace(/<g class="inv-card50" data-inverter-no="(\d+)" style="cursor:pointer">/g,
      '<g class="inv-card50" data-inverter-no="$1" style="cursor:pointer;pointer-events:all" role="button" tabindex="0" onclick="window.SolarBOQParts50&&window.SolarBOQParts50.openInverter($1)">');
    out=out.replace(/<g class="back-overview50" style="cursor:pointer">/g,
      '<g class="back-overview50" style="cursor:pointer;pointer-events:all" role="button" tabindex="0" onclick="window.SolarBOQParts50&&window.SolarBOQParts50.overview()">');
    return out;
  }

  const prevDiagram51=typeof diagramSvg==='function'?diagramSvg:null;
  if(prevDiagram51){
    diagramSvg=function(d){return patchSvg51(prevDiagram51(d));};
  }

  function bind51(){
    if(typeof document==='undefined')return;
    const out=document.getElementById('designOut');
    if(!out||out.dataset.clickFix51==='1')return;
    out.dataset.clickFix51='1';
    out.addEventListener('click',function(ev){
      const el=ev.target instanceof Element?ev.target:null;
      if(!el)return;
      const card=el.closest('.inv-card50');
      if(card){
        const n=Number(card.getAttribute('data-inverter-no')||0);
        if(n&&window.SolarBOQParts50?.openInverter){
          ev.preventDefault();ev.stopPropagation();
          window.SolarBOQParts50.openInverter(n);
        }
        return;
      }
      if(el.closest('.back-overview50')&&window.SolarBOQParts50?.overview){
        ev.preventDefault();ev.stopPropagation();
        window.SolarBOQParts50.overview();
      }
    });
    out.addEventListener('keydown',function(ev){
      if(ev.key!=='Enter'&&ev.key!==' ')return;
      const el=ev.target instanceof Element?ev.target:null;if(!el)return;
      const card=el.closest('.inv-card50');
      if(card){const n=Number(card.getAttribute('data-inverter-no')||0);if(n&&window.SolarBOQParts50?.openInverter){ev.preventDefault();window.SolarBOQParts50.openInverter(n);}}
      else if(el.closest('.back-overview50')&&window.SolarBOQParts50?.overview){ev.preventDefault();window.SolarBOQParts50.overview();}
    });
  }

  const prevRender51=typeof renderDesign==='function'?renderDesign:null;
  if(prevRender51){
    renderDesign=function(){
      prevRender51();
      bind51();
    };
  }

  if(typeof document!=='undefined'&&!document.getElementById('uat51Style')){
    const st=document.createElement('style');st.id='uat51Style';st.textContent=`
      .inv-card50{pointer-events:all}.inv-card50 *{pointer-events:visiblePainted}.inv-card50:hover rect{filter:drop-shadow(0 4px 8px rgba(25,118,210,.18))}.inv-card50:focus rect{stroke:#1976d2;stroke-width:3}.back-overview50{pointer-events:all}`;
    document.head.appendChild(st);
  }

  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind51,{once:true});else bind51();
  }
  window.SolarBOQClickFix51={bind:bind51,patchSvg:patchSvg51};
})();
