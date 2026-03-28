"""
Migration 0012: Add boost_count to Listing model.

This field existed in the database from an older migration
(0007_add_boost_antiscam_pricewatch) that was removed from source control,
but the column was never dropped from the production database.

We use SeparateDatabaseAndState to:
  - Update Django's model state (state_operations)
  - Only add the column if it does not already exist (database_operations)
"""

from django.db import migrations, models


def add_boost_count_if_missing(apps, schema_editor):
    """Add boost_count column if it doesn't already exist (cross-DB compatible)."""
    db_vendor = schema_editor.connection.vendor
    if db_vendor == "postgresql":
        schema_editor.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'listings'
                      AND column_name = 'boost_count'
                ) THEN
                    ALTER TABLE listings
                        ADD COLUMN boost_count integer NOT NULL DEFAULT 0;
                END IF;
            END $$;
        """)
    else:
        # SQLite / other: check via PRAGMA
        with schema_editor.connection.cursor() as cursor:
            cursor.execute("PRAGMA table_info(listings);")
            columns = [row[1] for row in cursor.fetchall()]
        if "boost_count" not in columns:
            schema_editor.execute(
                "ALTER TABLE listings ADD COLUMN boost_count integer NOT NULL DEFAULT 0;"
            )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("marketplace", "0011_listing_code_nullable"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name="listing",
                    name="boost_count",
                    field=models.PositiveIntegerField(default=0),
                ),
            ],
            database_operations=[
                migrations.RunPython(add_boost_count_if_missing, reverse_code=noop),
            ],
        ),
    ]
