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

    if faked:
        for app, name in faked:
            print(f"  [FAKED] {app}.{name}")
    else:
        print("  No migrations need faking.")


if __name__ == "__main__":
    main()
