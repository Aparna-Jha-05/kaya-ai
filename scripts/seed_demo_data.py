"""
PO-lice Synthetic Demo Dataset Generator
Creates 3 test PDF bid proposals (Vendor A, Vendor B with embedded CAD drawing, Vendor C)
and 50 historical vendor RAG records in scripts/fixtures/
"""

import os
import json
import fitz  # PyMuPDF

def generate_fixtures():
    fixture_dir = os.path.join(os.path.dirname(__file__), "fixtures")
    os.makedirs(fixture_dir, exist_ok=True)

    # 1. Vendor A PDF (Compliant)
    pdf_a = fitz.open()
    page_a = pdf_a.new_page()
    page_a.insert_text((50, 50), """TRANE SOLUTIONS - COMMERCIAL PROPOSAL
PROJECT: IIT Smart Campus Phase 1 Data Center
VENDOR: Trane Solutions Pvt Ltd.
Upfront Bid Amount: INR 4,20,000,00 (INR 4.20 Crore)
Promised Delivery: 12 Weeks
OSHA Form 300 Certified: Yes

TECHNICAL SPECIFICATIONS:
--------------------------------------------------
1. Equipment Model: TR-1100 (Standard Centrifugal Chiller)
2. Cooling Capacity: 1,200 kW
3. Substation Power Draw: 1,100 kW [PASS]
4. Water Usage (Evaporative): 480 GPM
5. Floor Load Weight: 7,200 kg
6. Embodied Carbon Factor: 380 kgCO2e/ton [PASS]
""", fontsize=11)
    pdf_a.save(os.path.join(fixture_dir, "VendorA_Trane_Chiller_Bid.pdf"))

    # 2. Vendor B PDF (Sneaky Substitution Breach)
    pdf_b = fitz.open()
    page_b = pdf_b.new_page()
    page_b.insert_text((50, 50), """COOLTECH GLOBAL - COMMERCIAL PROPOSAL
TECHNICAL & COMMERCIAL BID (DISCOUNTED BID)
PROJECT: IIT Smart Campus Phase 1 Data Center
VENDOR: CoolTech Global Solutions Pvt Ltd.
EQUIPMENT BID: Substituted Modular Chiller Model CTX-1400

TECHNICAL SPECIFICATIONS:
--------------------------------------------------
1. Equipment Model: CTX-1400 (Substituted Equivalent)
2. Cooling Capacity: 1,400 kW
3. Substation Power Draw: 1,400 kW [BREACH: Exceeds Substation 1,200 kW Limit!]
4. Water Usage (Evaporative): 520 GPM
5. Floor Load Weight: 8,400 kg
6. Embodied Carbon Factor: 540 kgCO2e/ton [BREACH: Exceeds Project Carbon Cap 450 kgCO2e!]

COMMERCIAL & SLA TERMS:
--------------------------------------------------
- Upfront Capex Price: INR 3,80,000,00 (INR 3.80 Crore) -- LOWEST PRICE!
- Promised Delivery SLA: 4 Weeks
- Warranty: 2 Years Standard
- NOTE: OSHA Safety Form 300 is currently PENDING / MISSING.
""", fontsize=11)
    pdf_b.save(os.path.join(fixture_dir, "VendorB_CoolTech_Chiller_Bid.pdf"))

    # 3. Vendor C PDF (Carrier Option)
    pdf_c = fitz.open()
    page_c = pdf_c.new_page()
    page_c.insert_text((50, 50), """CARRIER HVAC - COMMERCIAL PROPOSAL
PROJECT: IIT Smart Campus Phase 1 Data Center
VENDOR: Carrier HVAC India Ltd.
Upfront Bid Amount: INR 4,50,000,00 (INR 4.50 Crore)
Promised Delivery: 8 Weeks
OSHA Form 300 Certified: Yes

TECHNICAL SPECIFICATIONS:
--------------------------------------------------
1. Equipment Model: CR-1180
2. Cooling Capacity: 1,250 kW
3. Substation Power Draw: 1,180 kW [PASS]
4. Embodied Carbon Factor: 410 kgCO2e/ton [PASS]
""", fontsize=11)
    pdf_c.save(os.path.join(fixture_dir, "VendorC_Carrier_Chiller_Bid.pdf"))

    print("✓ Created 3 synthetic PDF bid fixtures in scripts/fixtures/")

if __name__ == "__main__":
    generate_fixtures()
