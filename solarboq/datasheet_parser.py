from __future__ import annotations
import re
from pathlib import Path
from typing import Any

try:
    import pdfplumber
except ImportError:
    pdfplumber = None
try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

NUM = r"[-+]?\d+(?:[.,]\d+)?"
SUPERSCRIPTS = "⁰¹²³⁴⁵⁶⁷⁸⁹"

def _f(x):
    try:
        return float(str(x).replace(",", "").strip())
    except Exception:
        return 0.0

def _clean(s):
    return re.sub(r"\s+", " ", str(s or "")).strip()

def _norm(s):
    return re.sub(r"[^a-z0-9]", "", str(s or "").lower())

def _strip_footnotes(s: str) -> str:
    s = str(s or "")
    s = s.translate(str.maketrans({c: " " for c in SUPERSCRIPTS}))
    s = re.sub(r"(?i)\b(voltage|range|power|current|trackers?|tracker|mppt|mpp)\s*[\*\u2020\u2021]+", r"\1 ", s)
    return s

def _pdf_text(path):
    parts = []
    if pdfplumber:
        try:
            with pdfplumber.open(path) as pdf:
                parts.append("\n".join((p.extract_text(x_tolerance=2, y_tolerance=2) or "") for p in pdf.pages))
        except Exception:
            pass
    if PdfReader:
        try:
            parts.append("\n".join((p.extract_text() or "") for p in PdfReader(path).pages))
        except Exception:
            pass
    text = "\n".join(p for p in parts if p)
    if not text:
        raise RuntimeError("Install pdfplumber or pypdf, or the PDF contains no extractable text")
    return _strip_footnotes(text)

def _tables(path):
    out = []
    if not pdfplumber:
        return out
    try:
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                for table in page.extract_tables() or []:
                    for row in table or []:
                        cells = [_clean(_strip_footnotes(c)) for c in row if c is not None]
                        if any(cells):
                            out.append(cells)
    except Exception:
        pass
    return out

def _detect_type(text, filename):
    s = (text + " " + filename).lower()
    if any(k in s for k in ["rapid shutdown", "rapid shutdown device", "rsd", "shutdown transmitter"]):
        return "rsd"
    if any(k in s for k in ["inverter", "mppt", "mpp tracker", "sun2000", "nominal ac active power"]):
        return "inverter"
    return "module"

def _manufacturer(text, filename):
    s = (text[:3000] + " " + filename).lower()
    brands = [
        ("Huawei", "huawei"), ("AIKO", "aiko"), ("AE Solar", "ae solar"),
        ("Jinko", "jinko"), ("LONGi", "longi"), ("Trina", "trina"),
        ("JA Solar", "ja solar"), ("Sungrow", "sungrow"), ("Kehua", "kehua"),
        ("GoodWe", "goodwe"), ("Deye", "deye"), ("Solis", "solis")
    ]
    for pretty, key in brands:
        if key in s:
            return pretty
    return ""

def _first(patterns, text, flags=re.I | re.S):
    for p in patterns:
        m = re.search(p, text, flags)
        if m:
            return m
    return None

def _model_from_filename(path):
    stem = Path(path).stem
    stem = re.sub(r"(?i)(datasheet|data_sheet|spec|specification|ver(?:sion)?[_\-. ]*\d.*)$", "", stem)
    return _clean(stem.replace("_", " ").replace("  ", " "))

def _numbers(s):
    return [_f(x) for x in re.findall(NUM, str(s or ""))]

def _module_variants(path, text, rows, manufacturer):
    power = []; vmp = []; voc = []; imp = []; isc = []; model = ""
    for row in rows:
        joined = " | ".join(row); low = joined.lower(); nums = _numbers(joined)
        if not model:
            m = re.search(r"\b([A-Z]{1,8}[-_][A-Z0-9][A-Z0-9._/+\-]{3,})\b", joined, re.I)
            if m:
                model = m.group(1)
        if ("maximum power" in low or re.search(r"\bpmax\b", low)) and len(nums) >= 2:
            vals = [x for x in nums if 300 <= x <= 1000]
            if len(vals) >= 2:
                power = vals
        elif any(k in low for k in ["voltage at maximum power", "maximum power voltage", "vmp", "vmpp"]) and len(nums) >= 1:
            vmp = [x for x in nums if 10 <= x <= 100]
        elif re.search(r"\bvoc\b", low) or "open circuit voltage" in low:
            voc = [x for x in nums if 10 <= x <= 100]
        elif any(k in low for k in ["current at maximum power", "maximum power current", "imp", "impp"]):
            imp = [x for x in nums if 1 <= x <= 40]
        elif re.search(r"\bisc\b", low) or "short circuit current" in low:
            isc = [x for x in nums if 1 <= x <= 40]
    if not power:
        for line in text.splitlines():
            low = line.lower()
            vals = [x for x in _numbers(line) if 300 <= x <= 1000]
            if len(vals) >= 2 and any(k in low for k in ["maximum power", "pmax", "rated power", "power output"]):
                power = vals
                break
    if not model:
        m = _first([
            r"\b([A-Z]{1,8}[-_][A-Z0-9][A-Z0-9._/+\-]{3,})\b",
            r"(?i)model\s*[:\-]?\s*([A-Z0-9][A-Z0-9._/+\-]{3,})"
        ], text)
        if m:
            model = m.group(1)
    if not model:
        model = _model_from_filename(path)
    if not power:
        m = _first([
            rf"(?i)(?:maximum power|pmax|rated power)[^\d]{{0,30}}({NUM})\s*W",
            rf"\b(\d{{3}})\s*W\b"
        ], text)
        if m:
            power = [_f(m.group(1))]
    def single(labelpats, lo, hi):
        m = _first([rf"(?i)(?:{p})[^\d]{{0,35}}({NUM})" for p in labelpats], text)
        if m:
            x = _f(m.group(1))
            return [x] if lo <= x <= hi else []
        return []
    if not vmp:
        vmp = single(["Vmp", "Vmpp", "Voltage at Maximum Power", "Maximum Power Voltage"], 10, 100)
    if not voc:
        voc = single(["Voc", "Open Circuit Voltage"], 10, 100)
    if not imp:
        imp = single(["Imp", "Impp", "Current at Maximum Power", "Maximum Power Current"], 1, 40)
    if not isc:
        isc = single(["Isc", "Short Circuit Current"], 1, 40)
    n = max(len(power), len(vmp), len(voc), len(imp), len(isc), 1)
    def val(arr, i):
        return arr[i] if i < len(arr) else (arr[0] if len(arr) == 1 else 0)
    variants = []
    for i in range(n):
        pw = val(power, i)
        suffix = f"-{int(pw)}W" if pw and str(int(pw)) not in model else ""
        variants.append({
            "type": "module", "manufacturer": manufacturer, "model": model + suffix,
            "revision": "", "power_w": pw, "vmp": val(vmp, i), "voc": val(voc, i),
            "imp": val(imp, i), "isc": val(isc, i), "temp_coeff_voc": 0,
            "dimensions": "", "weight_kg": 0, "rated_ac_kw": 0, "max_dc_v": 0,
            "mppt_min_v": 0, "mppt_max_v": 0, "num_mppt": 0, "inputs_per_mppt": 0,
            "max_current_mppt": 0, "max_isc_mppt": 0, "rated_output_current": 0,
            "modules_per_rsd": 0, "max_input_v": 0, "max_input_current": 0, "notes": ""
        })
    return variants

def _row_label(row):
    return _norm(row[0]) if row else ""

def _row_payload(row):
    if not row:
        return ""
    return " | ".join(row[1:]) if len(row) > 1 else row[0]

def _row_numbers(row, lo=None, hi=None):
    vals = _numbers(_row_payload(row))
    if lo is not None:
        vals = [x for x in vals if x >= lo]
    if hi is not None:
        vals = [x for x in vals if x <= hi]
    return vals

def _find_row(rows, labels):
    keys = [_norm(x) for x in labels]
    for row in rows:
        if not row:
            continue
        label = _row_label(row)
        if any(k and k in label for k in keys):
            return row
    return None

def _first_valid(vals, lo, hi):
    for x in vals:
        if lo <= x <= hi:
            return x
    return 0.0

def _inverter_variant(path, text, rows, manufacturer):
    model = ""
    for row in rows:
        joined = " | ".join(row)
        m = re.search(r"\b(SUN2000-[A-Z0-9._/+()\-]+)", joined, re.I)
        if m:
            model = m.group(1)
            break
    if not model:
        m = _first([
            r"\b(SUN2000-[A-Z0-9._/+()\-]+)",
            r"(?i)Model\s*[:\-]?\s*([A-Z0-9][A-Z0-9._/+()\-]{3,})"
        ], text)
        model = m.group(1) if m else _model_from_filename(path)

    # Prefer table rows. Huawei datasheets are spec tables and flattened text often
    # separates labels, footnotes and values, which caused the previous zero fields.
    ac = maxdc = mpmin = mpmax = nmp = inputs = maxcur = maxisc = outcur = 0.0

    row = _find_row(rows, ["Nominal AC Active Power", "Rated AC Power", "Nominal Output Power", "Rated Output Power"])
    if row:
        payload = _row_payload(row)
        vals = _numbers(payload)
        ac = _first_valid(vals, 5, 500000)
        if ac > 1000 or re.search(r"\bW\b", payload, re.I):
            ac = ac / 1000.0

    row = _find_row(rows, ["Max Input Voltage", "Max DC Input Voltage", "Maximum Input Voltage"])
    if row:
        maxdc = _first_valid(_row_numbers(row), 100, 2000)

    row = _find_row(rows, ["MPPT Operating Voltage Range", "MPPT Voltage Range", "MPP Voltage Range", "Operating Voltage Range"])
    if row:
        vals = [x for x in _row_numbers(row) if 50 <= x <= 1500]
        if len(vals) >= 2:
            mpmin, mpmax = min(vals[:4]), max(vals[:4])

    row = _find_row(rows, ["Number of MPP trackers", "No of MPP trackers", "Number of MPPT", "MPP trackers"])
    if row:
        nmp = _first_valid(_row_numbers(row), 1, 40)

    row = _find_row(rows, ["Max input number per MPP tracker", "Inputs per MPP tracker", "Max inputs per MPPT", "Input number per MPPT"])
    if row:
        inputs = _first_valid(_row_numbers(row), 1, 12)

    row = _find_row(rows, ["Max Current per MPPT", "Max input current per MPP tracker", "Maximum input current per MPPT"])
    if row:
        maxcur = _first_valid(_row_numbers(row), 1, 500)

    row = _find_row(rows, ["Max Short Circuit Current per MPPT", "Max short-circuit current per MPP tracker", "Short Circuit Current per MPPT"])
    if row:
        maxisc = _first_valid(_row_numbers(row), 1, 800)

    row = _find_row(rows, ["Nominal Output Current", "Rated Output Current"])
    if row:
        payload = _row_payload(row)
        m400 = re.search(rf"({NUM})\s*A[^|;\n]{{0,25}}400\s*V", payload, re.I)
        if not m400:
            m400 = re.search(rf"400\s*V[^|;\n]{{0,25}}({NUM})\s*A", payload, re.I)
        if m400:
            outcur = _f(m400.group(1))
        else:
            vals = [x for x in _numbers(payload) if 1 <= x <= 1000]
            current_like = [x for x in vals if x not in (380, 400, 415, 440, 480)]
            if current_like:
                outcur = max(current_like) if len(current_like) > 1 else current_like[0]

    clean_text = _strip_footnotes(text)

    def text_num(label_patterns, lo, hi, unit=None):
        for lp in label_patterns:
            unit_pat = rf"\s*{unit}\b" if unit else ""
            pat = rf"(?is)(?:{lp})\s*(?:[:\-]?\s*(?:\d{{1,2}}\s*)?)?[^0-9]{{0,80}}({NUM}){unit_pat}"
            m = re.search(pat, clean_text)
            if m:
                x = _f(m.group(1))
                if lo <= x <= hi:
                    return x
        return 0.0

    if not ac:
        mac = _first([
            rf"(?is)(?:Nominal AC Active Power|Rated AC Power|Nominal Output Power|Rated Output Power)\s*(?:\d{{1,2}}\s*)?[^0-9]{{0,100}}({NUM})\s*(kW|W)?"
        ], clean_text)
        if mac:
            ac = _f(mac.group(1))
            unit = (mac.group(2) or "").lower()
            if unit == "w" or ac > 1000:
                ac /= 1000.0

    if not maxdc:
        maxdc = text_num(["Max\\.?\\s*Input Voltage", "Max\\.?\\s*DC Input Voltage", "Maximum Input Voltage"], 100, 2000)

    if not (mpmin and mpmax):
        rng = _first([
            rf"(?is)(?:MPPT Operating Voltage Range|MPPT Voltage Range|MPP Voltage Range)\s*(?:\d{{1,2}}\s*)?[^0-9]{{0,100}}({NUM})\s*V?\s*(?:[-–~]|to)\s*({NUM})"
        ], clean_text)
        if rng:
            a, b = _f(rng.group(1)), _f(rng.group(2))
            if 50 <= a <= 1500 and 50 <= b <= 1500:
                mpmin, mpmax = min(a, b), max(a, b)

    if not nmp:
        nmp = text_num(["Number of MPP trackers", "No\\.? of MPP trackers", "Number of MPPTs?"], 1, 40)
    if not inputs:
        inputs = text_num(["Max\\.? input number per MPP tracker", "Inputs? per MPP tracker", "Max\\.? inputs? per MPPT"], 1, 12)
    if not maxcur:
        maxcur = text_num(["Max\\.? Current per MPPT", "Max\\.? input current per MPP tracker"], 1, 500, "A")
    if not maxisc:
        maxisc = text_num(["Max\\.? Short Circuit Current per MPPT", "Max\\.? short-circuit current per MPP tracker"], 1, 800, "A")
    if not outcur:
        outcur = text_num(["Nominal Output Current", "Rated Output Current"], 1, 1000, "A")

    notes = []
    required = {
        "AC kW": ac, "Max DC V": maxdc, "MPPT Min": mpmin, "MPPT Max": mpmax,
        "No.MPPT": nmp, "Inputs/MPPT": inputs, "Max A/MPPT": maxcur, "Max Isc/MPPT": maxisc
    }
    missing = [k for k, v in required.items() if not v]
    if missing:
        notes.append("Not detected: " + ", ".join(missing))

    return {
        "type": "inverter", "manufacturer": manufacturer, "model": model, "revision": "",
        "power_w": 0, "vmp": 0, "voc": 0, "imp": 0, "isc": 0, "temp_coeff_voc": 0,
        "dimensions": "", "weight_kg": 0, "rated_ac_kw": ac, "max_dc_v": maxdc,
        "mppt_min_v": mpmin, "mppt_max_v": mpmax, "num_mppt": int(nmp or 0),
        "inputs_per_mppt": int(inputs or 0), "max_current_mppt": maxcur,
        "max_isc_mppt": maxisc, "rated_output_current": outcur, "modules_per_rsd": 0,
        "max_input_v": 0, "max_input_current": 0, "notes": "; ".join(notes)
    }

def _rsd_variant(path, text, manufacturer):
    m = _first([
        r"(?i)Model\s*[:\-]?\s*([A-Z0-9][A-Z0-9._/+()\-]{3,})",
        r"\b([A-Z]{2,10}[-_][A-Z0-9._/+()\-]{3,})\b"
    ], text)
    model = m.group(1) if m else _model_from_filename(path)
    def num(patterns):
        m = _first(patterns, text)
        return _f(m.group(1)) if m else 0
    modules = num([
        r"(?i)(?:modules? per (?:device|RSD)|PV modules? per unit)[^\d]{0,30}(\d+)",
        r"(?i)(\d+)\s*(?:modules?|panels?)\s*(?:per|/)\s*(?:device|RSD)"
    ])
    maxv = num([rf"(?i)(?:Max\.? Input Voltage|Maximum Input Voltage)[^\d]{{0,30}}({NUM})\s*V"])
    maxi = num([rf"(?i)(?:Max\.? Input Current|Maximum Input Current)[^\d]{{0,30}}({NUM})\s*A"])
    return {
        "type": "rsd", "manufacturer": manufacturer, "model": model, "revision": "",
        "power_w": 0, "vmp": 0, "voc": 0, "imp": 0, "isc": 0, "temp_coeff_voc": 0,
        "dimensions": "", "weight_kg": 0, "rated_ac_kw": 0, "max_dc_v": 0,
        "mppt_min_v": 0, "mppt_max_v": 0, "num_mppt": 0, "inputs_per_mppt": 0,
        "max_current_mppt": 0, "max_isc_mppt": 0, "rated_output_current": 0,
        "modules_per_rsd": int(modules or 0), "max_input_v": maxv,
        "max_input_current": maxi, "notes": ""
    }

def parse_datasheet(path: str) -> dict[str, Any]:
    text = _pdf_text(path)
    rows = _tables(path)
    filename = Path(path).name
    typ = _detect_type(text, filename)
    manufacturer = _manufacturer(text, filename)
    if typ == "module":
        variants = _module_variants(path, text, rows, manufacturer)
    elif typ == "inverter":
        variants = [_inverter_variant(path, text, rows, manufacturer)]
    else:
        variants = [_rsd_variant(path, text, manufacturer)]
    return {
        "type": typ, "manufacturer": manufacturer,
        "parser": "table-first + footnote-safe text fallback v0.3.2",
        "source_filename": filename, "source_file": str(Path(path)), "variants": variants
    }
