// UAT v0.5.10 - Clean System Overview labels and remove repeated inverter MCCB line
(function(){
  function shiftY(tag,delta){
    return String(tag).replace(/\sy="([0-9.]+)"/,(_,y)=>` y="${Number(y)+delta}"`);
  }

  function tidy510(svg){
    let out=String(svg||'');
    if(!out.includes('Part 1 · System Overview') || !out.includes('sld58')) return out;

    // Remove secondary explanatory text requested by user.
    out=out.replace(/<text\b[^>]*class="boxS58"[^>]*>Existing Factory Main Distribution Board \/ PCC<\/text>/g,'');
    out=out.replace(/<text\b[^>]*class="boxS58"[^>]*>MA Isolation \/ AC Collection<\/text>/g,'');

    // Cable / breaker information is already shown in the feeder callout, so do not repeat it inside INV cards.
    out=out.replace(/<text\b[^>]*class="invC58"[^>]*>[^<]*<\/text>/g,'');

    // Rebalance the remaining text vertically after the removed lines.
    out=out.replace(/<text\b[^>]*class="boxT58"[^>]*>MDB MAIN \(FACTORY\)<\/text>/g,t=>shiftY(t,13));
    out=out.replace(/<text\b[^>]*class="boxT58"[^>]*>MDB SOLAR<\/text>/g,t=>shiftY(t,12));
    out=out.replace(/<text\b[^>]*class="hint58"[^>]*>Open String Arrangement →<\/text>/g,t=>shiftY(t,-21));

    // Slightly strengthen spacing hierarchy without changing electrical logic or positions of boxes/wires.
    out=out.replace('</style>',`.boxT58{letter-spacing:.15px}.mainA58{letter-spacing:.1px}.minorA58{letter-spacing:.05px}.invT58{letter-spacing:.1px}</style>`);
    return out;
  }

  const prev=typeof diagramSvg==='function'?diagramSvg:null;
  if(prev){diagramSvg=function(d){return tidy510(prev(d));};}

  window.SolarBOQTidy510={tidy:tidy510};
})();