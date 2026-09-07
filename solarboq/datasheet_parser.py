from __future__ import annotations
import re
from pathlib import Path
from typing import Any

try:
    import pdfplumber
except ImportError:
    pdfplumber=None
try:
    from pypdf import PdfReader
except ImportError:
    PdfReader=None

NUM=r"[-+]?\d+(?:[.,]\d+)?"

def _f(x):
    try:return float(str(x).replace(',','').strip())
    except:return 0.0

def _clean(s):return re.sub(r"\s+"," ",str(s or '')).strip()
def _norm(s):return re.sub(r"[^a-z0-9]","",str(s or '').lower())

def _pdf_text(path):
    if pdfplumber:
        with pdfplumber.open(path) as pdf:return "\n".join((p.extract_text(x_tolerance=2,y_tolerance=2) or '') for p in pdf.pages)
    if PdfReader:return "\n".join((p.extract_text() or '') for p in PdfReader(path).pages)
    raise RuntimeError('Install pdfplumber or pypdf')

def _tables(path):
    out=[]
    if not pdfplumber:return out
    try:
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                for table in page.extract_tables() or []:
                    for row in table or []:
                        out.append([_clean(c) for c in row if c is not None])
    except Exception:pass
    return out

def _detect_type(text,filename):
    s=(text+' '+filename).lower()
    if any(k in s for k in ['rapid shutdown','rapid shutdown device','rsd','shutdown transmitter']):return 'rsd'
    if any(k in s for k in ['inverter','mppt','mpp tracker','sun2000','nominal ac active power']):return 'inverter'
    return 'module'

def _manufacturer(text,filename):
    s=(text[:3000]+' '+filename).lower()
    brands=[('Huawei','huawei'),('AIKO','aiko'),('AE Solar','ae solar'),('Jinko','jinko'),('LONGi','longi'),('Trina','trina'),('JA Solar','ja solar'),('Sungrow','sungrow'),('Kehua','kehua'),('GoodWe','goodwe'),('Deye','deye'),('Solis','solis')]
    for pretty,key in brands:
        if key in s:return pretty
    return ''

def _first(patterns,text,flags=re.I|re.S):
    for p in patterns:
        m=re.search(p,text,flags)
        if m:return m
    return None

def _model_from_filename(path):
    stem=Path(path).stem
    stem=re.sub(r'(?i)(datasheet|data_sheet|spec|specification|ver(?:sion)?[_\-. ]*\d.*)$','',stem)
    return _clean(stem.replace('_',' ').replace('  ',' '))

def _numbers(s):return [_f(x) for x in re.findall(NUM,str(s or ''))]

def _module_variants(path,text,rows,manufacturer):
    power=[];vmp=[];voc=[];imp=[];isc=[];model=''
    # Prefer table rows because values stay in columns.
    for row in rows:
        joined=' | '.join(row);low=joined.lower();nums=_numbers(joined)
        if not model:
            m=re.search(r'\b([A-Z]{1,8}[-_][A-Z0-9][A-Z0-9._/+\-]{3,})\b',joined,re.I)
            if m:model=m.group(1)
        if ('maximum power' in low or re.search(r'\bpmax\b',low)) and len(nums)>=2:
            vals=[x for x in nums if 300<=x<=1000]
            if len(vals)>=2:power=vals
        elif any(k in low for k in ['voltage at maximum power','maximum power voltage','vmp','vmpp']) and len(nums)>=1:
            vmp=[x for x in nums if 10<=x<=100]
        elif re.search(r'\bvoc\b',low) or 'open circuit voltage' in low:
            voc=[x for x in nums if 10<=x<=100]
        elif any(k in low for k in ['current at maximum power','maximum power current','imp','impp']):
            imp=[x for x in nums if 1<=x<=40]
        elif re.search(r'\bisc\b',low) or 'short circuit current' in low:
            isc=[x for x in nums if 1<=x<=40]
    # Text fallback for common horizontal spec tables.
    if not power:
        for line in text.splitlines():
            low=line.lower();vals=[x for x in _numbers(line) if 300<=x<=1000]
            if len(vals)>=2 and any(k in low for k in ['maximum power','pmax','rated power','power output']):power=vals;break
    if not model:
        m=_first([r'\b([A-Z]{1,8}[-_][A-Z0-9][A-Z0-9._/+\-]{3,})\b',r'(?i)model\s*[:\-]?\s*([A-Z0-9][A-Z0-9._/+\-]{3,})'],text)
        if m:model=m.group(1)
    if not model:model=_model_from_filename(path)
    # Single-variant fallback.
    if not power:
        m=_first([rf'(?i)(?:maximum power|pmax|rated power)[^\d]{{0,30}}({NUM})\s*W',rf'\b(\d{{3}})\s*W\b'],text)
        if m:power=[_f(m.group(1))]
    def single(labelpats,lo,hi):
        m=_first([rf'(?i)(?:{p})[^\d]{{0,35}}({NUM})' for p in labelpats],text)
        if m:
            x=_f(m.group(1));return [x] if lo<=x<=hi else []
        return []
    if not vmp:vmp=single(['Vmp','Vmpp','Voltage at Maximum Power','Maximum Power Voltage'],10,100)
    if not voc:voc=single(['Voc','Open Circuit Voltage'],10,100)
    if not imp:imp=single(['Imp','Impp','Current at Maximum Power','Maximum Power Current'],1,40)
    if not isc:isc=single(['Isc','Short Circuit Current'],1,40)
    n=max(len(power),len(vmp),len(voc),len(imp),len(isc),1)
    def val(arr,i):return arr[i] if i<len(arr) else (arr[0] if len(arr)==1 else 0)
    variants=[]
    for i in range(n):
        pw=val(power,i)
        suffix=f"-{int(pw)}W" if pw and str(int(pw)) not in model else ''
        variants.append({'type':'module','manufacturer':manufacturer,'model':model+suffix,'revision':'','power_w':pw,'vmp':val(vmp,i),'voc':val(voc,i),'imp':val(imp,i),'isc':val(isc,i),'temp_coeff_voc':0,'dimensions':'','weight_kg':0,'rated_ac_kw':0,'max_dc_v':0,'mppt_min_v':0,'mppt_max_v':0,'num_mppt':0,'inputs_per_mppt':0,'max_current_mppt':0,'max_isc_mppt':0,'rated_output_current':0,'modules_per_rsd':0,'max_input_v':0,'max_input_current':0,'notes':''})
    return variants

def _inverter_variant(path,text,manufacturer):
    m=_first([r'\b(SUN2000-[A-Z0-9._/+()\-]+)',r'(?i)Model\s*[:\-]?\s*([A-Z0-9][A-Z0-9._/+()\-]{3,})'],text);model=m.group(1) if m else _model_from_filename(path)
    def num(patterns,scale=1):
        m=_first(patterns,text)
        return _f(m.group(1))*scale if m else 0
    ac=num([rf'(?i)(?:Nominal AC Active Power|Rated AC Power|Nominal Output Power|Rated Output Power)[^\d]{{0,45}}({NUM})\s*(kW|W)?'])
    # normalize W values
    mac=_first([rf'(?i)(?:Nominal AC Active Power|Rated AC Power|Nominal Output Power|Rated Output Power)[^\d]{{0,45}}({NUM})\s*(kW|W)?'],text)
    if mac:
        ac=_f(mac.group(1));unit=(mac.group(2) or '').lower();ac=ac/1000 if unit=='w' or ac>1000 else ac
    maxdc=num([rf'(?i)Max\.?\s*Input Voltage[^\d]{{0,40}}({NUM})',rf'(?i)Max\.?\s*DC Input Voltage[^\d]{{0,40}}({NUM})'])
    rng=_first([rf'(?i)(?:MPPT Operating Voltage Range|MPPT Voltage Range|MPP Voltage Range)[^\d]{{0,50}}({NUM})\s*(?:V)?\s*[-–~to]+\s*({NUM})'],text)
    mpmin=_f(rng.group(1)) if rng else 0;mpmax=_f(rng.group(2)) if rng else 0
    nmp=num([rf'(?i)(?:Number of MPP trackers|No\.? of MPP trackers|Number of MPPTs?)[^\d]{{0,40}}(\d+)'])
    inputs=num([rf'(?i)(?:Max\.? input number per MPP tracker|Inputs? per MPP tracker|Max\.? inputs? per MPPT)[^\d]{{0,40}}(\d+)'])
    maxcur=num([rf'(?i)(?:Max\.? Current per MPPT|Max\.? input current per MPP tracker)[^\d]{{0,40}}({NUM})\s*A'])
    maxisc=num([rf'(?i)(?:Max\.? Short Circuit Current per MPPT|Max\.? short-circuit current per MPP tracker)[^\d]{{0,40}}({NUM})\s*A'])
    outcur=num([rf'(?i)(?:Nominal Output Current|Rated Output Current)[^\d]{{0,40}}({NUM})\s*A'])
    return {'type':'inverter','manufacturer':manufacturer,'model':model,'revision':'','power_w':0,'vmp':0,'voc':0,'imp':0,'isc':0,'temp_coeff_voc':0,'dimensions':'','weight_kg':0,'rated_ac_kw':ac,'max_dc_v':maxdc,'mppt_min_v':mpmin,'mppt_max_v':mpmax,'num_mppt':int(nmp or 0),'inputs_per_mppt':int(inputs or 0),'max_current_mppt':maxcur,'max_isc_mppt':maxisc,'rated_output_current':outcur,'modules_per_rsd':0,'max_input_v':0,'max_input_current':0,'notes':''}

def _rsd_variant(path,text,manufacturer):
    m=_first([r'(?i)Model\s*[:\-]?\s*([A-Z0-9][A-Z0-9._/+()\-]{3,})',r'\b([A-Z]{2,10}[-_][A-Z0-9._/+()\-]{3,})\b'],text);model=m.group(1) if m else _model_from_filename(path)
    def num(patterns):
        m=_first(patterns,text);return _f(m.group(1)) if m else 0
    modules=num([r'(?i)(?:modules? per (?:device|RSD)|PV modules? per unit)[^\d]{0,30}(\d+)',r'(?i)(\d+)\s*(?:modules?|panels?)\s*(?:per|/)\s*(?:device|RSD)'])
    maxv=num([rf'(?i)(?:Max\.? Input Voltage|Maximum Input Voltage)[^\d]{{0,30}}({NUM})\s*V'])
    maxi=num([rf'(?i)(?:Max\.? Input Current|Maximum Input Current)[^\d]{{0,30}}({NUM})\s*A'])
    return {'type':'rsd','manufacturer':manufacturer,'model':model,'revision':'','power_w':0,'vmp':0,'voc':0,'imp':0,'isc':0,'temp_coeff_voc':0,'dimensions':'','weight_kg':0,'rated_ac_kw':0,'max_dc_v':0,'mppt_min_v':0,'mppt_max_v':0,'num_mppt':0,'inputs_per_mppt':0,'max_current_mppt':0,'max_isc_mppt':0,'rated_output_current':0,'modules_per_rsd':int(modules or 0),'max_input_v':maxv,'max_input_current':maxi,'notes':''}

def parse_datasheet(path:str)->dict[str,Any]:
    text=_pdf_text(path);rows=_tables(path);filename=Path(path).name;typ=_detect_type(text,filename);manufacturer=_manufacturer(text,filename)
    if typ=='module':variants=_module_variants(path,text,rows,manufacturer)
    elif typ=='inverter':variants=[_inverter_variant(path,text,manufacturer)]
    else:variants=[_rsd_variant(path,text,manufacturer)]
    return {'type':typ,'manufacturer':manufacturer,'parser':'table/layout + text fallback','source_filename':filename,'source_file':str(Path(path)),'variants':variants}
