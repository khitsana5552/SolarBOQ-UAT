from dataclasses import dataclass, asdict
from math import ceil, floor
from typing import Optional

@dataclass
class StringItem:
    string_no:int;modules:int;estimated_vmp:float;estimated_voc:float;estimated_imp:float;inverter_no:Optional[int]=None;mppt:Optional[int]=None;input_no:Optional[int]=None
    def to_dict(self):return asdict(self)
@dataclass
class StringDesign:
    total_modules:int;vmp:float;voc:float;imp:float;isc:float;target_voltage:float;max_modules_per_string:int;number_of_strings:int;strings:list[StringItem];num_mppt:int;inputs_per_mppt:int;inverter_qty:int;warnings:list[str];checks:list[dict]
    @property
    def distribution(self):return [s.modules for s in self.strings]
    def to_dict(self):
        d=asdict(self);d['distribution']=self.distribution;return d

def _balanced_distribution(total_modules,n_strings):
    base=total_modules//n_strings;rem=total_modules%n_strings;return [base+1 if i<rem else base for i in range(n_strings)]

def _allocate_mppts(strings,num_mppt,inputs_per_mppt,inverter_qty=1):
    warnings=[]
    inverter_qty=max(1,int(inverter_qty or 1))
    if num_mppt<=0:
        warnings.append('Inverter MPPT count is not available. MPPT assignment was not created.');return warnings
    if inputs_per_mppt<=0:
        inputs_per_mppt=1;warnings.append('Inputs per MPPT is not available. Diagram uses 1 input/MPPT as a display fallback; import/review the inverter datasheet for final allocation.')
    capacity_per_inverter=num_mppt*inputs_per_mppt
    total_capacity=capacity_per_inverter*inverter_qty
    if len(strings)>total_capacity:
        warnings.append(f'Calculated {len(strings)} strings but the total inverter input capacity is {total_capacity} ({inverter_qty} inverter(s) × {num_mppt} MPPT × {inputs_per_mppt} input/MPPT). Overflow strings remain unassigned.')

    # Balance strings across inverter units first, then across MPPTs inside each inverter.
    inv_buckets=[[] for _ in range(inverter_qty)]
    for s in sorted(strings,key=lambda s:(-s.modules,s.string_no)):
        candidates=[i for i in range(inverter_qty) if len(inv_buckets[i])<capacity_per_inverter]
        if not candidates:break
        idx=min(candidates,key=lambda i:(len(inv_buckets[i]),sum(x.modules for x in inv_buckets[i]),i))
        inv_buckets[idx].append(s)

    for inv_idx,inv_strings in enumerate(inv_buckets,start=1):
        buckets=[[] for _ in range(num_mppt)]
        for s in sorted(inv_strings,key=lambda s:(-s.modules,s.string_no)):
            candidates=[i for i in range(num_mppt) if len(buckets[i])<inputs_per_mppt]
            if not candidates:break
            idx=min(candidates,key=lambda i:(len(buckets[i]),sum(x.modules for x in buckets[i]),i))
            buckets[idx].append(s)
        for mppt_idx,bucket in enumerate(buckets,start=1):
            bucket.sort(key=lambda s:s.string_no)
            for inp_idx,s in enumerate(bucket,start=1):
                s.inverter_no=inv_idx;s.mppt=mppt_idx;s.input_no=inp_idx
            if len({s.modules for s in bucket})>1:
                warnings.append(f'INV-{inv_idx:02d} MPPT{mppt_idx} contains strings with different module counts. Review the allocation if those strings will operate in parallel on the same tracker.')
    return warnings

def calculate_string_design(total_modules:int,vmp:float,target_voltage:float=800.0,*,voc:float=0.0,imp:float=0.0,isc:float=0.0,num_mppt:int=0,inputs_per_mppt:int=0,inverter_qty:int=1,max_dc_v:float=0.0,mppt_min_v:float=0.0,mppt_max_v:float=0.0,max_current_mppt:float=0.0,max_isc_mppt:float=0.0)->StringDesign:
    if total_modules<=0:raise ValueError('Total modules must be greater than zero')
    if vmp<=0:raise ValueError('Module Vmp must be greater than zero')
    if target_voltage<=0:raise ValueError('Target string voltage must be greater than zero')
    inverter_qty=max(1,int(inverter_qty or 1))
    max_per_string=floor(target_voltage/vmp)
    if max_per_string<1:raise ValueError('Module Vmp is higher than the target string voltage')
    n_strings=ceil(total_modules/max_per_string);distribution=_balanced_distribution(total_modules,n_strings)
    strings=[StringItem(i+1,n,n*vmp,n*voc if voc else 0.0,imp) for i,n in enumerate(distribution)]
    warnings=_allocate_mppts(strings,int(num_mppt or 0),int(inputs_per_mppt or 0),inverter_qty);checks=[]
    max_string_vmp=max(s.estimated_vmp for s in strings);max_string_voc=max(s.estimated_voc for s in strings) if voc else 0.0
    checks.append({'name':'800/Vmp design rule','status':'PASS','value':f'Max {max_per_string} modules/string; calculated string Vmp ≤ {target_voltage:.1f} V'})
    if max_dc_v and voc:checks.append({'name':'Max DC voltage','status':'PASS' if max_string_voc<=max_dc_v else 'FAIL','value':f'String Voc {max_string_voc:.1f} V vs inverter max {max_dc_v:.1f} V'})
    else:checks.append({'name':'Max DC voltage','status':'N/A','value':'Need module Voc + inverter Max DC Voltage'})
    if mppt_min_v and mppt_max_v:
        within=all(mppt_min_v<=s.estimated_vmp<=mppt_max_v for s in strings);checks.append({'name':'MPPT operating range','status':'PASS' if within else 'FAIL','value':f'String Vmp range {min(s.estimated_vmp for s in strings):.1f}-{max_string_vmp:.1f} V vs MPPT {mppt_min_v:.1f}-{mppt_max_v:.1f} V'})
    else:checks.append({'name':'MPPT operating range','status':'N/A','value':'Need inverter MPPT voltage range'})
    if max_current_mppt and imp and num_mppt:
        fail=False;details=[]
        for inv_no in range(1,inverter_qty+1):
            for m in range(1,num_mppt+1):
                count=sum(1 for s in strings if s.inverter_no==inv_no and s.mppt==m)
                if not count:continue
                current=count*imp;details.append(f'INV{inv_no}-MPPT{m} {current:.2f}A');fail|=current>max_current_mppt
        checks.append({'name':'MPPT input current','status':'FAIL' if fail else 'PASS','value':', '.join(details)+f'; limit {max_current_mppt:.2f}A/MPPT'})
    else:checks.append({'name':'MPPT input current','status':'N/A','value':'Need module Imp + inverter current/MPPT'})
    if max_isc_mppt and isc and num_mppt:
        fail=False;details=[]
        for inv_no in range(1,inverter_qty+1):
            for m in range(1,num_mppt+1):
                count=sum(1 for s in strings if s.inverter_no==inv_no and s.mppt==m)
                if not count:continue
                current=count*isc;details.append(f'INV{inv_no}-MPPT{m} {current:.2f}A');fail|=current>max_isc_mppt
        checks.append({'name':'MPPT short-circuit current','status':'FAIL' if fail else 'PASS','value':', '.join(details)+f'; limit {max_isc_mppt:.2f}A/MPPT'})
    else:checks.append({'name':'MPPT short-circuit current','status':'N/A','value':'Need module Isc + inverter Isc/MPPT'})
    return StringDesign(total_modules,vmp,voc,imp,isc,target_voltage,max_per_string,n_strings,strings,int(num_mppt or 0),int(inputs_per_mppt or 0),inverter_qty,warnings,checks)

def design_from_dict(payload):
    strings=[StringItem(**s) for s in payload.get('strings',[])]
    return StringDesign(int(payload.get('total_modules',0)),float(payload.get('vmp',0)),float(payload.get('voc',0)),float(payload.get('imp',0)),float(payload.get('isc',0)),float(payload.get('target_voltage',800)),int(payload.get('max_modules_per_string',0)),int(payload.get('number_of_strings',len(strings))),strings,int(payload.get('num_mppt',0)),int(payload.get('inputs_per_mppt',0)),int(payload.get('inverter_qty',1) or 1),list(payload.get('warnings',[])),list(payload.get('checks',[])))
