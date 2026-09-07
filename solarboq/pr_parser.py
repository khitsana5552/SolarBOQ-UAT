from __future__ import annotations
import re
from dataclasses import dataclass, asdict
from pathlib import Path
try:
    from pypdf import PdfReader
except ImportError:
    PdfReader=None

@dataclass
class PRData:
    project_name:str="";design_name:str="";project_address:str="";dc_kwp:float=0.0;ac_kw:float=0.0;annual_mwh:float=0.0;performance_ratio:float=0.0;yield_kwh_kwp:float=0.0;module_model:str="";module_power_w:float=0.0;module_qty:int=0;inverter_model:str="";inverter_qty:int=0;aurora_strings:int=0;aurora_string_cable_m:float=0.0;source_file:str=""
    def to_dict(self): return asdict(self)

def _num(text):
    try:return float(str(text).replace(',','').strip())
    except Exception:return 0.0

def _clean(text):return re.sub(r"\s+"," ",str(text or "")).strip()

def extract_pdf_text(path):
    if PdfReader is None:raise RuntimeError("Missing dependency: pypdf")
    return "\n".join((p.extract_text() or "") for p in PdfReader(path).pages)

def _project_name_from_filename(path):
    stem=Path(path).stem;s=re.sub(r"^\s*(?:PR|Production\s*Report)[_\- ]*","",stem,flags=re.I);s=re.sub(r"[_\- ]+\d+(?:\.\d+)?\s*(?:kW|kWp)(?:.*)?$","",s,flags=re.I);return _clean(s.replace('_',' ').strip(' -_'))

def _looks_garbled_project_name(name):
    if not name:return True
    if re.search(r"[\ue000-\uf8ff]",name):return True
    tokens=name.split();return len(tokens)>=8 and sum(len(t)<=2 for t in tokens)/len(tokens)>0.45

def parse_production_report(path):
    text=extract_pdf_text(path);flat=re.sub(r"[\t\r]+"," ",text);data=PRData(source_file=str(Path(path)))
    m=re.search(r"Project\s*Name\s*(.*?)\s*Project\s*Address",flat,re.I|re.S)
    if m:data.project_name=_clean(m.group(1))
    if not data.project_name:
        m=re.search(r"Project\s*Name\s*([^\n]+)",flat,re.I)
        if m:data.project_name=_clean(m.group(1))
    if _looks_garbled_project_name(data.project_name):
        fallback=_project_name_from_filename(path)
        if fallback:data.project_name=fallback
    m=re.search(r"Design\s+([^\n]+)",flat,re.I)
    if m:data.design_name=_clean(m.group(1))
    m=re.search(r"(?:Project\s*)?Address\s*([+\-]?\d{1,3}\.\d+)\s*,\s*([+\-]?\d{1,3}\.\d+)",flat,re.I|re.S) or re.search(r"([+\-]?\d{1,3}\.\d{5,})\s*,\s*([+\-]?\d{1,3}\.\d{5,})",flat)
    if m:data.project_address=f"{m.group(1)}, {m.group(2)}"
    for pat,attr in [(r"Module\s*DC\s*Nameplate\s*([\d,.]+)\s*kW","dc_kwp"),(r"Inverter\s*AC\s*Nameplate\s*([\d,.]+)\s*kW","ac_kw"),(r"Annual\s*Production\s*([\d,.]+)\s*MWh","annual_mwh"),(r"Performance\s*Ratio\s*([\d,.]+)%","performance_ratio"),(r"kWh/kWp\s*([\d,.]+)","yield_kwh_kwp")]:
        m=re.search(pat,flat,re.I|re.S)
        if m:setattr(data,attr,_num(m.group(1)))
    m=re.search(r"Inverters\s+(.*?)\s*\((?:Huawei|Sungrow|Kehua|GoodWe|Deye|Solis)[^)]*\)\s+(\d+)\s*\(([\d,.]+)\s*kW\)",flat,re.I|re.S)
    if m:data.inverter_model=_clean(m.group(1));data.inverter_qty=int(m.group(2))
    else:
        inv_models=re.findall(r"(SUN2000-[A-Z0-9._/+()\-]+(?:\s*\(400V\))?)",flat,re.I)
        if inv_models:data.inverter_model=_clean(inv_models[-1])
    m=re.search(r"(?:Aiko,\s*)?([A-Z0-9]+-[A-Z0-9._/+()\-]+)\s*\((\d+(?:\.\d+)?)W\)",flat,re.I)
    if m:data.module_model=m.group(1).strip();data.module_power_w=_num(m.group(2))
    else:
        m=re.search(r"Module\s+([A-Za-z0-9][A-Za-z0-9 _/().+\-]+?)\s*\((\d+(?:\.\d+)?)W\)",flat,re.I|re.S)
        if m:data.module_model=_clean(m.group(1));data.module_power_w=_num(m.group(2))
    m=re.search(r"Module\s+(?:Aiko,\s*)?.*?\((\d+(?:\.\d+)?)W\)\s+(\d+)\s*\(([\d,.]+)\s*kW\)",flat,re.I|re.S)
    if m:
        if not data.module_power_w:data.module_power_w=_num(m.group(1))
        data.module_qty=int(m.group(2))
        if not data.dc_kwp:data.dc_kwp=_num(m.group(3))
    if not data.module_qty and data.module_power_w and data.dc_kwp:data.module_qty=int(round(data.dc_kwp*1000/data.module_power_w))
    if not data.inverter_qty and data.inverter_model:data.inverter_qty=1
    m=re.search(r"Strings[^\n]*?\s(\d+)\s*\(([\d,.]+)\s*m\)",flat,re.I)
    if m:data.aurora_strings=int(m.group(1));data.aurora_string_cable_m=_num(m.group(2))
    return data
