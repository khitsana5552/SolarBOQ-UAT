from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import pdfplumber


PRODUCTS = [
    ("3-Phase Commercial & Utility", "SUN2000-30K-MC0", "SUN2000-30K-MC0"),
    ("3-Phase Commercial & Utility", "SUN2000-40K-MC0", "SUN2000-40K-MC0"),
    ("3-Phase Commercial & Utility", "SUN2000-50K-MC0", "SUN2000-50K-MC0"),
    ("3-Phase Commercial & Utility", "SUN2000-100KTL-M2", "SUN2000-100KTL-M2 (AFCI)"),
    ("3-Phase Commercial & Utility", "SUN2000-150KTL-MG0", "SUN2000-150KTL-MG0"),
    ("3-Phase Commercial & Utility", "SUN5000-150KTL-MG0", "SUN5000-150KTL-MG0"),
    ("3-Phase Commercial & Utility", "SUN2000-330KTL-H1", "SUN2000-330KTL-H1"),
    ("3-Phase Commercial & Utility", "LUNA2000-241-2S1", "Smart String ESS LUNA2000-241-2S1"),
    ("3-Phase Residential", "SUN2000-5K-MAP0", "SUN2000-5K-MAP0"),
    ("3-Phase Residential", "SUN2000-10K-MAP0", "SUN2000-10K-MAP0"),
    ("3-Phase Residential", "SUN2000-15K-MB0", "SUN2000-15K-MB0"),
    ("3-Phase Residential", "SUN2000-20K-MB0", "SUN2000-20K-MB0"),
    ("1-Phase Residential", "SUN2000-5K-LB0", "SUN2000-5K-LB0"),
    ("1-Phase Residential", "SUN2000-10K-LC0", "SUN2000-10K-LC0"),
    ("Optimizer", "MERC-600W-PA0", "Optimizer MERC-600W-PA0"),
    ("Optimizer", "MERC-1100W-P (Long input cable)", "MERC-1100W-P (Long input cable)"),
    ("Optimizer", "MERC-1100W-P (Short input cable)", "MERC-1100W-P (Short input cable)"),
    ("Optimizer", "MERC-1300W-P (Long input cable)", "MERC-1300W-P (Long input cable)"),
    ("Monitoring and Others", "SmartLogger3000A00GL", "SmartLogger3000A00GL (LAN only)"),
    ("Monitoring and Others", "SmartLogger3000A01EU", "SmartLogger3000A01EU (LAN+4G)"),
    ("Monitoring and Others", "SmartDongle-WLAN-FE", "SmartDongle-WLAN-FE (SDongleA-05), AP+STA"),
    ("Monitoring and Others", "SmartDongleB-06-EU", "SmartDongleB-06-EU (4G)"),
    ("Monitoring and Others", "DDSU666-H", "DDSU666-H (1 Phase Power Sensor)"),
    ("Monitoring and Others", "DTSU666-H (3 Phases", "DTSU666-H (3 Phases Power Sensor)"),
    ("Monitoring and Others", "DTSU666-HW", "DTSU666-HW (3 phase), used with external CT"),
    ("Monitoring and Others", "SmartLogger5000B03EU", "SmartLogger5000B03EU"),
    ("Monitoring and Others", "SmartMGC5000B06GL", "SmartMGC5000B06GL"),
    ("Monitoring and Others", "SmartModule1000A01", "SmartModule1000A01"),
    ("Residential Energy Storage System", "LUNA Power Module", "LUNA Power Module (LUNA2000-10KW-C1)"),
    ("Residential Energy Storage System", "LUNA Battery Modules", "LUNA Battery Modules, LiFePO4, 6.9kWH (LUNA2000-7-E1)"),
    ("Residential Energy Storage System", "EMMA-A02", "EMMA-A02"),
    ("Residential Energy Storage System", "SmartGuard-63A-S0", "SmartGuard-63A-S0 (1 Phase)"),
    ("Residential Energy Storage System", "SmartGuard-63A-T0", "SmartGuard-63A-T0 (3 Phase)"),
    ("EV Charger", "Scharger-7KS-S0", "Scharger-7KS-S0 (1 Phase)"),
    ("EV Charger", "SCharger-22KT-S0", "SCharger-22KT-S0 (3 Phase)"),
    ("Solar Cable", "Solar Cable H1Z2Z2-K, 4sqm., 100m/drum", "Solar Cable H1Z2Z2-K, 4sqm., 100m/drum (Black/Red)"),
    ("Solar Cable", "Solar Cable H1Z2Z2-K, 4sqm.,1,000m/drum", "Solar Cable H1Z2Z2-K, 4sqm.,1,000m/drum (Black/Red)"),
    ("Solar Cable", "Solar Cable H1Z2Z2-K, 6sqm., 100m/drum", "Solar Cable H1Z2Z2-K, 6sqm., 100m/drum (Black/Red)"),
    ("Solar Module", "JAM72S30-555-MR", "JA Solar JAM72S30-555-MR"),
    ("Solar Module", "JAM72D42-650/LB", "JA Solar JAM72D42-650/LB"),
    ("Solar Module", "JAM66D46-720/LB", "JA Solar JAM66D46-720/LB"),
    ("Mounting Structure", "Rail 4.8m", "Rail 4.8m"),
]

ALIASES = {
    "SUN2000-150KTL-MG0": ["SUN2000-150K-MG0"],
    "SUN5000-150KTL-MG0": ["SUN5000-150K-MG0"],
    "SUN2000-100KTL-M2 (AFCI)": ["SUN2000-100KTL-M2"],
    "SmartLogger3000A01EU (LAN+4G)": ["SmartLogger3000A01EU (LAN+4G )"],
}

PRICE_RE = re.compile(r"(?<![A-Z0-9])([0-9]{1,3}(?:,[0-9]{3})+\.[0-9]{2}|[0-9]{1,3}\.[0-9]{2})(?![A-Z0-9])")
CODE_RE = re.compile(r"\b(?:1HWE|1JAS|1ANT|1KKC)[0-9]{5,}\b", re.I)


def _norm(s: str) -> str:
    return "".join(ch.lower() for ch in str(s or "") if ch.isalnum())


def _extract_text(path: str) -> str:
    pages = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            pages.append(page.extract_text(layout=True, x_tolerance=2, y_tolerance=2) or "")
    return "\n".join(pages)


def parse_huawei_pricebook(path: str) -> dict[str, Any]:
    text = _extract_text(path)
    lines = [re.sub(r"\s+", " ", x).strip() for x in text.splitlines() if x.strip()]
    title = next((x for x in lines if "PRICELIST" in x.upper()), "Huawei Pricebook")
    valid_until = ""
    m = re.search(r"valid until\s+([^\n]+?)(?:\s+or\s+cease|$)", text, re.I)
    if m:
        valid_until = re.sub(r"\s+", " ", m.group(1)).strip()

    items = []
    missing = []
    for category, token, display in PRODUCTS:
        candidates = [ln for ln in lines if token.lower() in ln.lower()]
        row = candidates[0] if candidates else ""
        prices = PRICE_RE.findall(row)
        if not row or not prices:
            missing.append(display)
            continue
        price = float(prices[0].replace(",", ""))
        code_match = CODE_RE.search(row)
        aliases = ALIASES.get(display, [])
        items.append({
            "category": category,
            "name": display,
            "normalized_name": _norm(display),
            "aliases": aliases,
            "item_code": code_match.group(0) if code_match else "",
            "price_baht": price,
            "price_ex_vat": True,
            "source_row": row[:500],
        })

    return {
        "title": title,
        "source_filename": Path(path).name,
        "valid_until": valid_until,
        "price_ex_vat": True,
        "confidential": "confidential" in text.lower(),
        "items": items,
        "missing": missing,
        "parser": "huawei_pricebook_layout_v1",
    }
