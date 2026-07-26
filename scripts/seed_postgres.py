"""Seed benchmark and three deterministic Bid Integrity Matrix scenarios."""
import os

SQL = """
INSERT INTO commodity_benchmarks (material_type, benchmark_index, price_per_unit, valid_from, valid_to)
VALUES ('steel', 'LME_STEEL_DEMO', 50000000, CURRENT_DATE, CURRENT_DATE + 30)
ON CONFLICT DO NOTHING;
-- Three demo correlations between Vendor B and Vendor C: IP, bank account, PDF fingerprint.
UPDATE bids SET submission_ip = '203.0.113.18', bank_account = 'ACCT-DEMO-7788',
  pdf_fingerprint = '7a4d359427e82d3bce7ed1c8ed6ddfe3e8df2c0eb66e3f0f0575538d0ef2fba9',
  bid_integrity_signals = '{"scenario":"shared submission IP, bank account, and PDF template"}'::jsonb
WHERE vendor_id IN ('VENDOR-B-8921', 'VENDOR-C-4500');
"""

if __name__ == "__main__":
    try:
        import psycopg
    except ImportError as error:
        raise SystemExit("Install psycopg[binary] and set DATABASE_URL before seeding PostgreSQL.") from error
    with psycopg.connect(os.environ["DATABASE_URL"]) as connection:
        with connection.cursor() as cursor:
            cursor.execute(SQL)
        connection.commit()
    print("Seeded commodity benchmark and three Bid Integrity Matrix scenarios.")
