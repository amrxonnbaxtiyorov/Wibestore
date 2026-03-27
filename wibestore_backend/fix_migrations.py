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

    # Ensure migration recorder table exists
    recorder.ensure_schema()

    # applied_migrations() returns (app_label, migration_name) tuples, not named objects
    applied = {(r[0], r[1]) for r in recorder.applied_migrations()}
    tables = get_existing_tables()

    faked = []

    # accounts.0003: telegram_registration_codes table + user.telegram_id
    migration_key = ("accounts", "0003_telegram_registration")
    if migration_key not in applied:
        if "telegram_registration_codes" in tables:
            recorder.record_applied(*migration_key)
            faked.append(migration_key)

    # accounts.0004: full_name column on telegram_registration_codes
    migration_key = ("accounts", "0004_telegramregistrationcode_full_name_and_code_length")
    if migration_key not in applied:
        if "telegram_registration_codes" in tables:
            cols = get_existing_columns("telegram_registration_codes")
            if "full_name" in cols:
                recorder.record_applied(*migration_key)
                faked.append(migration_key)

    # marketplace.0006: listing_code column on listings table
    if "listings" in tables:
        listing_cols = get_existing_columns("listings")
        if "listing_code" not in listing_cols:
            print("  [PREEMPTIVE] Adding listing_code column to listings table...")
            try:
                with connection.cursor() as cursor:
                    cursor.execute(
                        "ALTER TABLE listings ADD COLUMN listing_code VARCHAR(10) NOT NULL DEFAULT ''"
                    )
                    # Populate existing rows with sequential codes
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
            except Exception as e:
                print(f"  [PREEMPTIVE] listing_code creation failed: {e}")

    if faked:
        for app, name in faked:
            print(f"  [FAKED] {app}.{name}")
    else:
        print("  No migrations need faking.")


if __name__ == "__main__":
    main()
