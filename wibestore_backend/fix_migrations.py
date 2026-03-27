"""
Fix migration state: if DB tables/columns already exist but
django_migrations doesn't record them, fake those migrations.
Run BEFORE 'manage.py migrate'.
"""
import os
import sys

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import connection
from django.db.migrations.recorder import MigrationRecorder


def get_existing_tables():
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
        )
        return {row[0] for row in cursor.fetchall()}


def get_existing_columns(table_name):
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT column_name FROM information_schema.columns WHERE table_name = %s",
            [table_name],
        )
        return {row[0] for row in cursor.fetchall()}


def main():
    recorder = MigrationRecorder(connection)
    recorder.ensure_schema()

    applied = {(r[0], r[1]) for r in recorder.applied_migrations()}
    tables = get_existing_tables()

    faked = []

    # ── accounts.0003: telegram_registration_codes ──
    migration_key = ("accounts", "0003_telegram_registration")
    if migration_key not in applied:
        if "telegram_registration_codes" in tables:
            recorder.record_applied(*migration_key)
            faked.append(migration_key)

    # ── accounts.0004: full_name column ──
    migration_key = ("accounts", "0004_telegramregistrationcode_full_name_and_code_length")
    if migration_key not in applied:
        if "telegram_registration_codes" in tables:
            cols = get_existing_columns("telegram_registration_codes")
            if "full_name" in cols:
                recorder.record_applied(*migration_key)
                faked.append(migration_key)

    # ── marketplace migrations: listing_code and rental fields ──
    if "listings" in tables:
        listing_cols = get_existing_columns("listings")

        # Step 1: Ensure listing_code column exists
        if "listing_code" not in listing_cols:
            print("  [PREEMPTIVE] Adding listing_code column to listings table...")
            try:
                with connection.cursor() as cursor:
                    cursor.execute(
                        "ALTER TABLE listings ADD COLUMN listing_code VARCHAR(10) NULL"
                    )
                    cursor.execute(
                        """
                        WITH numbered AS (
                            SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) + 1000 AS num
                            FROM listings
                            WHERE listing_code = '' OR listing_code IS NULL
                        )
                        UPDATE listings SET listing_code = 'WB-' || numbered.num
                        FROM numbered WHERE listings.id = numbered.id
                        """
                    )
                    cursor.execute(
                        "CREATE UNIQUE INDEX IF NOT EXISTS listings_listing_code_uniq ON listings (listing_code)"
                    )
                print("  [PREEMPTIVE] listing_code column added and populated.")
                listing_cols.add("listing_code")
            except Exception as e:
                print(f"  [PREEMPTIVE] listing_code creation failed: {e}")

        # Step 2: Fix empty strings → NULL (critical for unique constraint)
        if "listing_code" in listing_cols:
            try:
                with connection.cursor() as cursor:
                    cursor.execute("UPDATE listings SET listing_code = NULL WHERE listing_code = ''")
                    count = cursor.rowcount
                    if count:
                        print(f"  [FIX] Converted {count} empty listing_codes to NULL")
                    # Make column nullable if it isn't already
                    cursor.execute(
                        "ALTER TABLE listings ALTER COLUMN listing_code DROP NOT NULL"
                    )
                    cursor.execute(
                        "ALTER TABLE listings ALTER COLUMN listing_code DROP DEFAULT"
                    )
            except Exception as e:
                print(f"  [FIX] listing_code fix: {e}")

        # Step 3: FAKE marketplace migrations if columns already exist
        # This is CRITICAL — without faking 0006, all subsequent migrations (0007-0011) won't run
        marketplace_migrations_to_fake = [
            ("marketplace", "0006_add_listing_code", ["listing_code"]),
            ("marketplace", "0007_add_rental_fields", ["rental_period_days", "rental_price_per_day", "rental_deposit"]),
            ("marketplace", "0008_add_rental_time_slots", ["rental_time_slots"]),
        ]

        for app, name, required_cols in marketplace_migrations_to_fake:
            mkey = (app, name)
            if mkey not in applied:
                if all(c in listing_cols for c in required_cols):
                    recorder.record_applied(*mkey)
                    faked.append(mkey)

        # 0009 adds ListingPromotion table
        mkey = ("marketplace", "0009_add_listing_promotion")
        if mkey not in applied and "listing_promotions" in tables:
            recorder.record_applied(*mkey)
            faked.append(mkey)

    if faked:
        for app, name in faked:
            print(f"  [FAKED] {app}.{name}")
    else:
        print("  No migrations need faking.")


if __name__ == "__main__":
    main()
