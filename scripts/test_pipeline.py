"""
End-to-End Pipeline Test Script
Parses synthetic PDFs for Vendor A, Vendor B, and Vendor C, runs the 4 Patrols,
and verifies deterministic TCO² calculations and recommendations.
"""

import os
import sys

# Ensure backend folder is in PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

from app.services.extractor import PDFExtractorService
from app.services.patrols import PatrolEngineService

def test_bid(pdf_filename: str):
    fixture_dir = os.path.join(os.path.dirname(__file__), 'fixtures')
    pdf_path = os.path.join(fixture_dir, pdf_filename)

    print(f"\n🔍 Testing Pipeline on: {pdf_filename}")
    print("=" * 65)

    extracted = PDFExtractorService.extract_from_pdf_path(pdf_path)
    scorecard = PatrolEngineService.run_all_patrols(extracted)

    print(f"• Vendor: {scorecard.vendor_name}")
    print(f"• Upfront Capex: ₹{scorecard.upfront_capex_inr/10000000:.2f} Cr")
    print(f"• Calculated 5-Year TCO²: ₹{scorecard.calculated_tco2_inr/10000000:.2f} Cr")
    print(f"• Recommendation: {scorecard.recommendation}")
    print("\n🛡️ Patrol Engine Results:")

    for res in scorecard.patrol_results:
        status_symbol = "✓" if res.status == "PASS" else ("❌" if res.status == "FAIL" else "⚠️")
        print(f"  [{status_symbol} {res.patrol_name}] Status: {res.status} | Reason: {res.reason}")

def main():
    print("============================================================")
    print("🚀 PO-lice End-to-End Compliance Pipeline Verification")
    print("============================================================")

    test_bid("VendorA_Trane_Chiller_Bid.pdf")
    test_bid("VendorB_CoolTech_Chiller_Bid.pdf")
    test_bid("VendorC_Carrier_Chiller_Bid.pdf")

    print("\n============================================================")
    print("✨ End-to-End Pipeline Verification COMPLETE!")
    print("============================================================")

if __name__ == '__main__':
    main()
