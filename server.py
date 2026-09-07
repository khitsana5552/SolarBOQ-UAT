from __future__ import annotations

import json, os, shutil, sqlite3, time, threading
from pathlib import Path
from typing import Optional, Any

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from solarboq.pr_parser import parse_production_report
from solarboq.datasheet_parser import parse_datasheet
from solarboq.string_engine import calculate_string_design
from solarboq.boq_master import MASTER_ROWS, PROJECT_TEMPLATES
from updater import DATA_DIR, UPLOAD_DIR, system_info, save_config, check_for_update, stage_update, stage_rollback

APP_DIR = Path(__file__).resolve().parent
DB_PATH = DATA_DIR / "solarboq_uat.db"
STATIC_DIR = APP_DIR / "static"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Solar BOQ Web UAT")
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

def db():
    con = sqlite3.connect(DB_PATH); con.row_factory = sqlite3.Row; return con

def init_db():
    with db() as con:
        con.executescript('''
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
            template TEXT DEFAULT 'Rooftop - Standard', customer TEXT DEFAULT '', site TEXT DEFAULT '', utility TEXT DEFAULT 'PEA',
            design_name TEXT DEFAULT '', project_address TEXT DEFAULT '', dc_kwp REAL DEFAULT 0, ac_kw REAL DEFAULT 0,
            annual_mwh REAL DEFAULT 0, performance_ratio REAL DEFAULT 0, yield_kwh_kwp REAL DEFAULT 0,
            module_model TEXT DEFAULT '', module_power_w REAL DEFAULT 0, module_qty INTEGER DEFAULT 0,
            inverter_model TEXT DEFAULT '', inverter_qty INTEGER DEFAULT 0, aurora_strings INTEGER DEFAULT 0,
            aurora_string_cable_m REAL DEFAULT 0, pr_source TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS equipment (
            id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, manufacturer TEXT DEFAULT '', model TEXT NOT NULL,
            revision TEXT DEFAULT '', power_w REAL DEFAULT 0, vmp REAL DEFAULT 0, voc REAL DEFAULT 0, imp REAL DEFAULT 0, isc REAL DEFAULT 0,
            temp_coeff_voc REAL DEFAULT 0, dimensions TEXT DEFAULT '', weight_kg REAL DEFAULT 0, rated_ac_kw REAL DEFAULT 0,
            max_dc_v REAL DEFAULT 0, mppt_min_v REAL DEFAULT 0, mppt_max_v REAL DEFAULT 0, num_mppt INTEGER DEFAULT 0,
            inputs_per_mppt INTEGER DEFAULT 0, max_current_mppt REAL DEFAULT 0, max_isc_mppt REAL DEFAULT 0,
            rated_output_current REAL DEFAULT 0, modules_per_rsd INTEGER DEFAULT 0, max_input_v REAL DEFAULT 0,
            max_input_current REAL DEFAULT 0, source_filename TEXT DEFAULT '', source_file TEXT DEFAULT '', notes TEXT DEFAULT '',
            active INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
        CREATE UNIQUE INDEX IF NOT EXISTS uq_equipment ON equipment(type, manufacturer, model, revision);
        CREATE TABLE IF NOT EXISTS diagrams (
            id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL, name TEXT NOT NULL,
            payload TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
        ''')

def project_or_404(project_id:int):
    with db() as con: r=con.execute("SELECT * FROM projects WHERE id=?",(project_id,)).fetchone()
    if not r: raise HTTPException(404,"Project not found")
    return dict(r)

def equipment_or_none(eq_id:Optional[int]):
    if not eq_id:return None
    with db() as con:r=con.execute("SELECT * FROM equipment WHERE id=?",(eq_id,)).fetchone()
    return dict(r) if r else None

init_db()

@app.get("/",response_class=HTMLResponse)
def home(): return FileResponse(STATIC_DIR/"index.html")

class UpdateConfigPatch(BaseModel):
    enabled:Optional[bool]=None; channel:Optional[str]=None; auto_check_on_start:Optional[bool]=None
    manifest_url:Optional[str]=None; github_repo:Optional[str]=None; github_asset_keyword:Optional[str]=None

@app.get("/api/system/info")
def api_system_info(): return system_info()
@app.patch("/api/system/update-config")
def api_update_config(p:UpdateConfigPatch): return save_config(p.model_dump(exclude_none=True))
@app.get("/api/system/check-update")
def api_check_update(): return check_for_update()
@app.post("/api/system/update-and-restart")
def api_update_and_restart():
    info=check_for_update()
    if not info.get("update_available"): raise HTTPException(400,info.get("message") or "No update available")
    try: pending=stage_update(info)
    except Exception as e: raise HTTPException(500,str(e))
    threading.Thread(target=lambda:(time.sleep(.8),os._exit(42)),daemon=True).start()
    return {"ok":True,"pending":pending,"message":"Update staged. Solar BOQ will restart automatically."}
@app.post("/api/system/rollback-and-restart/{backup_id}")
def api_rollback_and_restart(backup_id:str):
    try: pending=stage_rollback(backup_id)
    except Exception as e: raise HTTPException(400,str(e))
    threading.Thread(target=lambda:(time.sleep(.8),os._exit(42)),daemon=True).start()
    return {"ok":True,"pending":pending,"message":"Rollback staged. Solar BOQ will restart automatically."}

@app.get("/api/templates")
def templates(): return PROJECT_TEMPLATES
@app.get("/api/projects")
def list_projects():
    with db() as con: rows=con.execute("SELECT * FROM projects ORDER BY updated_at DESC,id DESC").fetchall()
    return [dict(r) for r in rows]

class ProjectCreate(BaseModel): name:str; template:str="Rooftop - Standard"
@app.post("/api/projects")
def create_project(p:ProjectCreate):
    name=p.name.strip() or "New Solar Project"
    if p.template not in PROJECT_TEMPLATES:p.template="Rooftop - Standard"
    with db() as con: cur=con.execute("INSERT INTO projects(name,template) VALUES (?,?)",(name,p.template));pid=cur.lastrowid
    return project_or_404(pid)
class ProjectUpdate(BaseModel):
    name:Optional[str]=None; template:Optional[str]=None; customer:Optional[str]=None; site:Optional[str]=None
    utility:Optional[str]=None; design_name:Optional[str]=None; project_address:Optional[str]=None
@app.patch("/api/projects/{project_id}")
def update_project(project_id:int,p:ProjectUpdate):
    project_or_404(project_id);data=p.model_dump(exclude_none=True)
    if not data:return project_or_404(project_id)
    allowed={"name","template","customer","site","utility","design_name","project_address"};data={k:v for k,v in data.items() if k in allowed}
    if "name" in data and not str(data["name"]).strip():raise HTTPException(400,"Project name cannot be empty")
    sets=", ".join(f"{k}=?" for k in data)+", updated_at=CURRENT_TIMESTAMP"
    with db() as con:con.execute(f"UPDATE projects SET {sets} WHERE id=?",(*data.values(),project_id))
    return project_or_404(project_id)
@app.delete("/api/projects/{project_id}")
def delete_project(project_id:int):
    project_or_404(project_id)
    with db() as con:con.execute("DELETE FROM diagrams WHERE project_id=?",(project_id,));con.execute("DELETE FROM projects WHERE id=?",(project_id,))
    return {"ok":True}

@app.post("/api/projects/{project_id}/import-pr")
async def import_pr(project_id:int,file:UploadFile=File(...)):
    project_or_404(project_id)
    if not file.filename.lower().endswith('.pdf'):raise HTTPException(400,"Production Report must be PDF")
    path=UPLOAD_DIR/f"pr_{project_id}_{int(time.time())}_{Path(file.filename).name}"
    with path.open('wb') as out:shutil.copyfileobj(file.file,out)
    data=parse_production_report(str(path)).to_dict()
    fields=['design_name','project_address','dc_kwp','ac_kw','annual_mwh','performance_ratio','yield_kwh_kwp','module_model','module_power_w','module_qty','inverter_model','inverter_qty','aurora_strings','aurora_string_cable_m']
    update={k:data.get(k) for k in fields}
    if data.get('project_name'):update['name']=data['project_name']
    update['pr_source']=str(path);sets=", ".join(f"{k}=?" for k in update)+", updated_at=CURRENT_TIMESTAMP"
    with db() as con:con.execute(f"UPDATE projects SET {sets} WHERE id=?",(*update.values(),project_id))
    return {"project":project_or_404(project_id),"parsed":data}

@app.get("/api/equipment")
def equipment_list(type:Optional[str]=None):
    q="SELECT * FROM equipment";args=[]
    if type:q+=" WHERE type=?";args.append(type)
    q+=" ORDER BY type,manufacturer,model,revision"
    with db() as con:rows=con.execute(q,args).fetchall()
    return [dict(r) for r in rows]
@app.post("/api/equipment/parse")
async def parse_equipment(file:UploadFile=File(...)):
    if not file.filename.lower().endswith('.pdf'):raise HTTPException(400,"Datasheet must be PDF")
    path=UPLOAD_DIR/f"ds_{int(time.time()*1000)}_{Path(file.filename).name}"
    with path.open('wb') as out:shutil.copyfileobj(file.file,out)
    parsed=parse_datasheet(str(path))
    for v in parsed.get('variants') or []:v['source_file']=str(path);v['source_filename']=file.filename
    parsed['source_file']=str(path);parsed['source_filename']=file.filename
    return parsed
class EquipmentSave(BaseModel): variants:list[dict[str,Any]]
@app.post("/api/equipment/save")
def save_equipment(payload:EquipmentSave):
    saved=[];errors=[]
    columns=['type','manufacturer','model','revision','power_w','vmp','voc','imp','isc','temp_coeff_voc','dimensions','weight_kg','rated_ac_kw','max_dc_v','mppt_min_v','mppt_max_v','num_mppt','inputs_per_mppt','max_current_mppt','max_isc_mppt','rated_output_current','modules_per_rsd','max_input_v','max_input_current','source_filename','source_file','notes','active']
    with db() as con:
        for v in payload.variants:
            if not str(v.get('model','')).strip():errors.append('Skipped one item because model is empty');continue
            vals=[v.get(c,0 if c not in ('type','manufacturer','model','revision','dimensions','source_filename','source_file','notes') else '') for c in columns]
            try:
                qs=','.join('?' for _ in columns);con.execute(f"INSERT OR REPLACE INTO equipment({','.join(columns)}) VALUES ({qs})",vals)
                row=con.execute("SELECT * FROM equipment WHERE type=? AND manufacturer=? AND model=? AND revision=?",(v.get('type',''),v.get('manufacturer',''),v.get('model',''),v.get('revision',''))).fetchone();saved.append(dict(row))
            except Exception as e:errors.append(str(e))
    return {"saved":saved,"errors":errors}
@app.delete("/api/equipment/{equipment_id}")
def delete_equipment(equipment_id:int):
    with db() as con:
        r=con.execute("SELECT id FROM equipment WHERE id=?",(equipment_id,)).fetchone()
        if not r:raise HTTPException(404,"Equipment not found")
        con.execute("DELETE FROM equipment WHERE id=?",(equipment_id,))
    return {"ok":True}

@app.get("/api/projects/{project_id}/suggest-equipment")
def suggest_equipment(project_id:int):
    p=project_or_404(project_id)
    with db() as con:
        mods=[dict(r) for r in con.execute("SELECT * FROM equipment WHERE type='module' AND active=1").fetchall()]
        invs=[dict(r) for r in con.execute("SELECT * FROM equipment WHERE type='inverter' AND active=1").fetchall()]
    norm=lambda s:''.join(ch.lower() for ch in str(s or '') if ch.isalnum());pm=norm(p.get('module_model'));pi=norm(p.get('inverter_model'))
    mod=max(mods,key=lambda x:(int(norm(x['model']) in pm or pm in norm(x['model'])) if pm else 0,-abs(float(x.get('power_w') or 0)-float(p.get('module_power_w') or 0)))) if mods else None
    inv=max(invs,key=lambda x:(int(norm(x['model']) in pi or pi in norm(x['model'])) if pi else 0,-abs(float(x.get('rated_ac_kw') or 0)-float(p.get('ac_kw') or 0)))) if invs else None
    return {"module":mod,"inverter":inv}

class StringRequest(BaseModel):
    project_id:int;module_id:int;inverter_id:Optional[int]=None;rsd_id:Optional[int]=None;target_voltage:float=800.0
@app.post("/api/string-design")
def string_design(req:StringRequest):
    p=project_or_404(req.project_id);mod=equipment_or_none(req.module_id);inv=equipment_or_none(req.inverter_id);rsd=equipment_or_none(req.rsd_id)
    if not mod or mod.get('type')!='module':raise HTTPException(400,'Select a module')
    total=int(p.get('module_qty') or 0)
    if total<=0:
        if p.get('dc_kwp') and mod.get('power_w'):total=round(float(p['dc_kwp'])*1000/float(mod['power_w']))
        else:raise HTTPException(400,'Project module quantity is missing. Import PR or enter project data first.')
    d=calculate_string_design(total_modules=total,vmp=float(mod.get('vmp') or 0),target_voltage=req.target_voltage,voc=float(mod.get('voc') or 0),imp=float(mod.get('imp') or 0),isc=float(mod.get('isc') or 0),num_mppt=int((inv or {}).get('num_mppt') or 0),inputs_per_mppt=int((inv or {}).get('inputs_per_mppt') or 0),max_dc_v=float((inv or {}).get('max_dc_v') or 0),mppt_min_v=float((inv or {}).get('mppt_min_v') or 0),mppt_max_v=float((inv or {}).get('mppt_max_v') or 0),max_current_mppt=float((inv or {}).get('max_current_mppt') or 0),max_isc_mppt=float((inv or {}).get('max_isc_mppt') or 0)).to_dict()
    d['project']=p;d['module']=mod;d['inverter']=inv;d['rsd']=rsd
    if rsd and int(rsd.get('modules_per_rsd') or 0)>0:
        import math;d['rsd_qty']=math.ceil(total/int(rsd['modules_per_rsd']))
    else:d['rsd_qty']=0
    return d

class DiagramSave(BaseModel):project_id:int;name:str;payload:dict[str,Any]
@app.get("/api/diagrams")
def diagrams(project_id:int):
    with db() as con:rows=con.execute("SELECT id,project_id,name,created_at FROM diagrams WHERE project_id=? ORDER BY id DESC",(project_id,)).fetchall()
    return [dict(r) for r in rows]
@app.get("/api/diagrams/{diagram_id}")
def diagram_get(diagram_id:int):
    with db() as con:r=con.execute("SELECT * FROM diagrams WHERE id=?",(diagram_id,)).fetchone()
    if not r:raise HTTPException(404,'Diagram not found')
    d=dict(r);d['payload']=json.loads(d['payload']);return d
@app.post("/api/diagrams")
def diagram_save(d:DiagramSave):
    project_or_404(d.project_id)
    with db() as con:cur=con.execute("INSERT INTO diagrams(project_id,name,payload) VALUES (?,?,?)",(d.project_id,d.name.strip() or 'String Diagram',json.dumps(d.payload)));did=cur.lastrowid
    return diagram_get(did)
@app.delete("/api/diagrams/{diagram_id}")
def diagram_delete(diagram_id:int):
    with db() as con:con.execute("DELETE FROM diagrams WHERE id=?",(diagram_id,))
    return {"ok":True}

@app.get("/api/boq/{project_id}")
def boq(project_id:int):
    p=project_or_404(project_id);tpl=PROJECT_TEMPLATES.get(p.get('template')) or PROJECT_TEMPLATES['Rooftop - Standard'];defaults=tpl.get('boq_defaults',{});dc_w=float(p.get('dc_kwp') or 0)*1000;rows=[]
    for r in MASTER_ROWS:
        x=r.to_dict();qty=float(defaults.get(r.description,r.default_qty) or 0);rule=r.rule
        if rule=='module_qty':qty=float(p.get('module_qty') or 0)
        elif rule=='dc_watts':qty=dc_w
        elif rule=='inv_qty_any':qty=float(p.get('inverter_qty') or 0)
        elif rule.startswith('inv_'):
            try:target=float(rule.split('_',1)[1]);qty=float(p.get('inverter_qty') or 1) if abs(float(p.get('ac_kw') or 0)-target)<1 else 0
            except:pass
        elif rule=='rsd_qty':qty=0
        x['qty']=qty;x['rate']=float(r.default_rate or 0);x['total']=qty*x['rate'];rows.append(x)
    return {"project":p,"rows":rows,"grand_total":sum(x['total'] for x in rows)}

if __name__=='__main__':
    import uvicorn
    print('Solar BOQ Web UAT: http://127.0.0.1:8765')
    uvicorn.run(app,host='127.0.0.1',port=8765,log_level='warning')
