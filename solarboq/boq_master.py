from dataclasses import dataclass, asdict

@dataclass
class BOQRow:
    item: str
    description: str
    details: str = ""
    detail_unit: str = ""
    unit: str = ""
    default_qty: float = 0.0
    default_rate: float = 0.0
    remark: str = ""
    rule: str = "manual"
    category: str = "General"
    def to_dict(self): return asdict(self)

MASTER_ROWS = [
    BOQRow("1", "Solar Module ", "650", "W", "Panel", 0, 3300, "", "module_qty", "Equipment"),
    BOQRow("2", "Inverter 215KW", "215", "kW", "Set", 0, 219000, "", "inv_215", "Equipment"),
    BOQRow("3", "Inverter 150KW", "150", "kW", "Set", 0, 200000, "", "inv_150", "Equipment"),
    BOQRow("4", "Inverter 50KW", "50", "kW", "Set", 0, 87950, "", "inv_50", "Equipment"),
    BOQRow("5", "Inverter 40 kW", "40", "kW", "Set", 0, 74740, "", "inv_40", "Equipment"),
    BOQRow("6", "Inverter 30 kW", "30", "kW", "Set", 0, 71860, "", "inv_30", "Equipment"),
    BOQRow("7", "Battery 241kWh Kehua ", "241", "kW", "Ea", 0, 1460000, "", "manual", "Equipment"),
    BOQRow("8", "Smart Dongle", "", "", "Set", 1, 2500, "", "smart_dongle", "Equipment"),
    BOQRow("", "Rapid Shutdown", "", "", "", 0, 1150, "", "rsd_qty", "Equipment"),
    BOQRow("", "Transmitter ", "", "", "", 1, 6500, "", "transmitter", "Equipment"),
    BOQRow("8", "Equipment Modify on Riser Pole 22kV", "", "", "Lot", 0, 250000, "", "manual", "MV / Utility"),
    BOQRow("9", "Relays+Test Plugs", "", "", "Set", 0, 75000, "", "manual", "MV / Utility"),
    BOQRow("10", "PQM Meter", "", "", "Set", 1, 15000, "", "manual", "Electrical"),
    BOQRow("11", "Protections and Relays Panels", "", "", "Set", 0, 50000, "", "manual", "Electrical"),
    BOQRow("12", "Modify SWGR ", "", "", "", 0, 200000, "", "manual", "MV / Utility"),
    BOQRow("13", "Riser Pole 22kV", "", "", "Ea", 0, 40000, "", "manual", "MV / Utility"),
    BOQRow("14", "TOU selling meter", "", "", "", 0, 200000, "", "manual", "MV / Utility"),
    BOQRow("15", "Panels (MDB-Solars) + kW-Hr Meter", "", "", "Set", 1, 80000, "", "manual", "Electrical"),
    BOQRow("16", "Panels DC Fuses", "", "", "Set", 0, 25000, "", "manual", "Electrical"),
    BOQRow("17", "Data Logger Panel", "", "", "Set", 0, 5000, "", "manual", "Electrical"),
    BOQRow("18", "Add new MCCB in the existing MDBs", "", "", "Set", 1, 10000, "", "manual", "Electrical"),
    BOQRow("19", "Add new CT in the existing MDBs", "", "", "Lot", 1, 10000, "", "manual", "Electrical"),
    BOQRow("20", "Transformer 500 kVA", "", "", "Lot", 0, 325000, "", "manual", "MV / Utility"),
    BOQRow("21", "H-Type for Transformers", "", "", "Lot", 0, 180000, "", "manual", "MV / Utility"),
    BOQRow("22", "Overhead Lines Cables", "", "", "m", 0, 160, "", "manual", "MV / Utility"),
    BOQRow("23", "Overhead Lines Cables (Ground Wires)", "", "", "m", 0, 100, "", "manual", "MV / Utility"),
    BOQRow("24", "Overhead Lines Poles", "", "", "set", 0, 25000, "", "manual", "MV / Utility"),
    BOQRow("25", "Supports and Clamps ", "", "", "W", 0, 1, "", "dc_watts", "Installation"),
    BOQRow("26", "Inverter Frame Structures", "", "", "Set", 1, 7500, "", "inv_qty_any", "Installation"),
    BOQRow("27", "AC Cables (THW-A 240 mm2)", "0", "m", "m", 0, 157.3, "", "manual", "Cable / Raceway"),
    BOQRow("28", "AC Cables (3/C-185 mm2 CV)", "0", "m", "m", 0, 4550, "", "manual", "Cable / Raceway"),
    BOQRow("29", "AC Cables (3/C-240 mm2 CV)", "0", "m", "m", 0, 3620, "", "manual", "Cable / Raceway"),
    BOQRow("30", "AC Cables (3/C-150 mm2 CV)", "0", "m", "m", 0, 2200, "", "manual", "Cable / Raceway"),
    BOQRow("31", "AC Cables (3/C-95 mm2 CV)", "0", "", "m", 0, 1405, "", "manual", "Cable / Raceway"),
    BOQRow("", "AC Cables (1/C-70 mm2 CV)", "", "", "m", 0, 474, "", "manual", "Cable / Raceway"),
    BOQRow("32", "AC Cables (1/C-70 mm2 CV)", "", "", "m", 0, 474, "", "manual", "Cable / Raceway"),
    BOQRow("33", "AC Cables (1/C-35 mm2 CV)", "", "", "m", 0, 1022, "", "manual", "Cable / Raceway"),
    BOQRow("35", "DC Cables (2x1/C-4 mm2 PV)", "", "m", "m", 0, 32, "", "manual", "Cable / Raceway"),
    BOQRow("36", "Grounding Cables (1/C-6 mm2 THW)", "", "", "m", 0, 42, "", "manual", "Cable / Raceway"),
    BOQRow("37", "Cables Accessories", "", "", "m", 1, 15000, "", "manual", "Cable / Raceway"),
    BOQRow("38", "Tripping and Signal Cable form Relay Box to Smart Logger", "", "", "m", 0, 250, "", "manual", "Cable / Raceway"),
    BOQRow("39", "RS485 Cables", "", "", "m", 40, 115, "", "manual", "Cable / Raceway"),
    BOQRow("40", 'Raceways AC, 2" IMC', "", "", "m", 0, 250, "", "manual", "Cable / Raceway"),
    BOQRow("41", "Raceways AC WW 100x100", "", "", "m", 5, 1430, "", "manual", "Cable / Raceway"),
    BOQRow("42", 'Raceways DC, 3/4" IMC', "", "", "m", 0, 72, "", "manual", "Cable / Raceway"),
    BOQRow("43", "Raceway DC 50x50", "", "", "m", 0, 450, "", "manual", "Cable / Raceway"),
    BOQRow("44", "Concrete Pole", "", "", "Pole", 0, 16000, "", "manual", "Civil"),
    BOQRow("45", "Installation", "", "", "W", 0, 1.2, "", "dc_watts", "Installation"),
    BOQRow("46", "Walkways (2.4x0.3 m)", "", "", "m", 0, 700, "", "manual", "Civil"),
    BOQRow("47", "Ladders", "", "", "m", 1, 15000, "", "manual", "Civil"),
    BOQRow("48", "Life line", "", "", "m", 0, 250, "", "manual", "Safety"),
    BOQRow("49", "Indicators and Sensors", "", "", "Set", 0, 45000, "", "manual", "Electrical"),
    BOQRow("50", 'Water Cleaning (1" PP-R Pipes)', "", "", "m", 60, 120, "", "manual", "Civil"),
    BOQRow("51", "Water Pump Set", "", "", "Set", 0, 30000, "", "manual", "Civil"),
    BOQRow("52", "Testing: Relays(2 Times, Internal+PEA)", "", "", "Time", 0, 20000, "", "manual", "Testing"),
    BOQRow("53", "Crane", "", "", "", 1, 8000, "", "manual", "Construction"),
    BOQRow("54", "Hieb", "", "", "", 1, 6000, "", "manual", "Construction"),
    BOQRow("55", "Engineering", "", "", "Lot", 1, 100000, "", "manual", "Engineering / O&M"),
    BOQRow("56", "PM/CM 2 Years", "", "", "Time", 4, 4000, "", "manual", "Engineering / O&M"),
    BOQRow("57", "Indirect Cost - PM", "", "", "Month", 0, 25000, "", "manual", "Indirect Cost"),
    BOQRow("58", "Indirect Cost - Sup", "", "", "Month", 1, 30000, "", "manual", "Indirect Cost"),
    BOQRow("59", "Indirect Cost - Safety Officer", "", "", "Month", 0, 25000, "", "manual", "Indirect Cost"),
    BOQRow("60", "Indirect Cost - Driver", "", "", "Month", 0, 12000, "", "manual", "Indirect Cost"),
    BOQRow("61", "Indirect Cost - Sell", "", "", "Month", 0, 25000, "", "manual", "Indirect Cost"),
    BOQRow("62", "Indirect Cost - Site Office", "", "", "Month", 1, 8000, "", "manual", "Indirect Cost"),
    BOQRow("63", "Indirect Cost - House Rental", "", "", "Month", 1, 7500, "", "manual", "Indirect Cost"),
    BOQRow("64", "Indirect Cost - Temporary Scaffolding (Stair)", "", "", "Lot", 0, 15000, "", "manual", "Indirect Cost"),
    BOQRow("65", "Indirect Cost - Temporary EE Power Supply", "", "", "Lot", 0, 20000, "", "manual", "Indirect Cost"),
    BOQRow("66", "Indirect Cost - Temporary Stationary", "", "", "Lot", 0, 10000, "", "manual", "Indirect Cost"),
    BOQRow("67", "Indirect Cost - Travelling: Air Fright", "", "", "Lot", 0, 20000, "", "manual", "Indirect Cost"),
    BOQRow("68", "Indirect Cost - Travelling: Accomodation", "", "", "Lot", 0, 5000, "700 THB per Night", "manual", "Indirect Cost"),
    BOQRow("69", "Indirect Cost - Head Office - Rental", "", "", "Lot", 0, 15000, "", "manual", "Indirect Cost"),
    BOQRow("70", "Indirect Cost - Head Office - Admin", "", "", "Lot", 0, 15000, "", "manual", "Indirect Cost"),
    BOQRow("71", "Indirect Cost - Head Office - Account", "", "", "Lot", 0, 3000, "", "manual", "Indirect Cost"),
    BOQRow("72", "Contact Works - Revenue Stamp", "", "", "Lot", 0, 12000, "", "manual", "Contract / Fee"),
    BOQRow("73", "Contact Works - Bond Fee(Performaced+Retention 2 years)", "", "", "Lot", 0, 36000, "", "manual", "Contract / Fee"),
    BOQRow("74", "Contact Works - Project Insurance", "", "", "Lot", 0, 30000, "", "manual", "Contract / Fee"),
    BOQRow("75", "Commission Expenses", "", "", "Lot", 1, 0, "", "dc_watts_rate", "Contract / Fee"),
    BOQRow("76", "Government Secret Fee : อ.1", "", "", "Lot", 1, 30000, "", "manual", "Government Fee"),
    BOQRow("77", "Government Fee : อ.1", "", "", "Lot", 1, 10000, "", "manual", "Government Fee"),
    BOQRow("78", "Government Fee : อ.1 สามัญโยธา", "", "", "Lot", 1, 10000, "", "manual", "Government Fee"),
    BOQRow("79", "Government Fee : อ.1 สามัญสถาปนิก", "", "", "Lot", 1, 10000, "", "manual", "Government Fee"),
    BOQRow("80", "Government Secret Fee : ERC", "", "", "Lot", 0, 10000, "", "manual", "Government Fee"),
    BOQRow("81", "Government Fee : MEA/PEA", "", "", "Lot", 1, 10000, "", "manual", "Government Fee"),
]

PROJECT_TEMPLATES={
"Rooftop - Standard":{"system_type":"Rooftop","description":"Standard rooftop project. Keeps the company BOQ rows intact and applies only conservative defaults.","boq_defaults":{"Smart Dongle":1,"PQM Meter":1,"Panels (MDB-Solars) + kW-Hr Meter":1,"Add new MCCB in the existing MDBs":1,"Add new CT in the existing MDBs":1,"Cables Accessories":1,"RS485 Cables":40,"Raceways AC WW 100x100":5,"Ladders":1,'Water Cleaning (1" PP-R Pipes)':60,"Crane":1,"Hieb":1,"Engineering":1,"PM/CM 2 Years":4,"Indirect Cost - Sup":1,"Indirect Cost - Site Office":1,"Indirect Cost - House Rental":1,"Government Secret Fee : อ.1":1,"Government Fee : อ.1":1,"Government Fee : อ.1 สามัญโยธา":1,"Government Fee : อ.1 สามัญสถาปนิก":1,"Government Fee : MEA/PEA":1}},
"Carport - Standard":{"system_type":"Carport","description":"Carport template. Structural and site quantities remain manual/override until project rules are confirmed.","boq_defaults":{"Smart Dongle":1,"PQM Meter":1,"Panels (MDB-Solars) + kW-Hr Meter":1,"Add new MCCB in the existing MDBs":1,"Add new CT in the existing MDBs":1,"Cables Accessories":1,"RS485 Cables":40,"Engineering":1,"PM/CM 2 Years":4,"Government Fee : MEA/PEA":1}},
"Ground Mount - Standard":{"system_type":"Ground Mount","description":"Ground-mount template. Cable/civil/MV quantities are deliberately left for site inputs unless a rule is explicitly defined.","boq_defaults":{"Smart Dongle":1,"PQM Meter":1,"Panels (MDB-Solars) + kW-Hr Meter":1,"Cables Accessories":1,"RS485 Cables":40,"Engineering":1,"PM/CM 2 Years":4,"Government Fee : MEA/PEA":1}}
}
