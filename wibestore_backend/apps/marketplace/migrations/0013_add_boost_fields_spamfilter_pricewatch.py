"""
Migration 0013: Add missing fields and models from deleted migration.

Fields added to Listing: is_boosted, boost_until, seller_ip
New models: SpamFilter, PriceWatch

All database operations use RunPython with cross-DB checks (SQLite + PostgreSQL).
"""

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def _column_exists(cursor, table, column, vendor):
    if vendor == "postgresql":
        cursor.execute(
            "SELECT 1 FROM information_schema.columns WHERE table_name=%s AND column_name=%s",
            [table, column],
        )
        return bool(cursor.fetchone())
    else:
        cursor.execute(f"PRAGMA table_info({table});")
        return any(row[1] == column for row in cursor.fetchall())


def _table_exists(cursor, table, vendor):
    if vendor == "postgresql":
        cursor.execute(
            "SELECT 1 FROM information_schema.tables WHERE table_name=%s", [table]
        )
        return bool(cursor.fetchone())
    else:
        # SQLite: use inline table name (safe — table names are hardcoded in this migration)
        cursor.execute(f"SELECT 1 FROM sqlite_master WHERE type='table' AND name='{table}';")
        return bool(cursor.fetchone())


def add_listing_columns(apps, schema_editor):
    vendor = schema_editor.connection.vendor
    with schema_editor.connection.cursor() as cursor:
        if not _column_exists(cursor, "listings", "is_boosted", vendor):
            if vendor == "postgresql":
                schema_editor.execute(
                    "ALTER TABLE listings ADD COLUMN is_boosted boolean NOT NULL DEFAULT false;"
                )
                schema_editor.execute(
                    "CREATE INDEX IF NOT EXISTS listings_is_boosted_idx ON listings (is_boosted);"
                )
            else:
                schema_editor.execute(
                    "ALTER TABLE listings ADD COLUMN is_boosted integer NOT NULL DEFAULT 0;"
                )

        if not _column_exists(cursor, "listings", "boost_until", vendor):
            schema_editor.execute(
                "ALTER TABLE listings ADD COLUMN boost_until %s NULL;"
                % ("timestamptz" if vendor == "postgresql" else "datetime")
            )

        if not _column_exists(cursor, "listings", "seller_ip", vendor):
            schema_editor.execute(
                "ALTER TABLE listings ADD COLUMN seller_ip %s NULL;"
                % ("inet" if vendor == "postgresql" else "text")
            )


def create_spam_filters(apps, schema_editor):
    vendor = schema_editor.connection.vendor
    with schema_editor.connection.cursor() as cursor:
        if not _table_exists(cursor, "spam_filters", vendor):
            if vendor == "postgresql":
                schema_editor.execute("""
                    CREATE TABLE spam_filters (
                        id serial PRIMARY KEY,
                        filter_type varchar(20) NOT NULL DEFAULT 'word',
                        word varchar(255) NOT NULL DEFAULT '',
                        pattern varchar(500) NOT NULL DEFAULT '',
                        action varchar(20) NOT NULL DEFAULT 'reject',
                        is_active boolean NOT NULL DEFAULT true,
                        created_at timestamptz NOT NULL DEFAULT now()
                    );
                """)
            else:
                schema_editor.execute("""
                    CREATE TABLE spam_filters (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        filter_type varchar(20) NOT NULL DEFAULT 'word',
                        word varchar(255) NOT NULL DEFAULT '',
                        pattern varchar(500) NOT NULL DEFAULT '',
                        action varchar(20) NOT NULL DEFAULT 'reject',
                        is_active integer NOT NULL DEFAULT 1,
                        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
                    );
                """)


def create_price_watches(apps, schema_editor):
    vendor = schema_editor.connection.vendor
    with schema_editor.connection.cursor() as cursor:
        if not _table_exists(cursor, "price_watches", vendor):
            if vendor == "postgresql":
                schema_editor.execute("""
                    CREATE TABLE price_watches (
                        id serial PRIMARY KEY,
                        user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        game_id integer NOT NULL REFERENCES games(id) ON DELETE CASCADE,
                        min_price numeric(15,2) NULL,
                        max_price numeric(15,2) NULL,
                        is_active boolean NOT NULL DEFAULT true,
                        last_notified_at timestamptz NULL,
                        created_at timestamptz NOT NULL DEFAULT now()
                    );
                """)
            else:
                schema_editor.execute("""
                    CREATE TABLE price_watches (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        game_id integer NOT NULL REFERENCES games(id) ON DELETE CASCADE,
                        min_price numeric(15,2) NULL,
                        max_price numeric(15,2) NULL,
                        is_active integer NOT NULL DEFAULT 1,
                        last_notified_at datetime NULL,
                        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
                    );
                """)


def create_boost_index(apps, schema_editor):
    vendor = schema_editor.connection.vendor
    if vendor == "postgresql":
        schema_editor.execute("""
            CREATE INDEX IF NOT EXISTS listings_status_db3073_idx
                ON listings (status, is_boosted, is_premium, created_at DESC);
        """)
    else:
        with schema_editor.connection.cursor() as cursor:
            cursor.execute("""
                SELECT name FROM sqlite_master
                WHERE type='index' AND name='listings_status_db3073_idx';
            """)
            if not cursor.fetchone():
                schema_editor.execute("""
                    CREATE INDEX listings_status_db3073_idx
                        ON listings (status, is_boosted, is_premium, created_at);
                """)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("marketplace", "0012_add_boost_count"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("games", "0001_initial"),
    ]

    operations = [
        # ── Listing columns: is_boosted, boost_until, seller_ip ────────────
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name="listing",
                    name="is_boosted",
                    field=models.BooleanField(default=False, db_index=True),
                ),
                migrations.AddField(
                    model_name="listing",
                    name="boost_until",
                    field=models.DateTimeField(null=True, blank=True),
                ),
                migrations.AddField(
                    model_name="listing",
                    name="seller_ip",
                    field=models.GenericIPAddressField(null=True, blank=True),
                ),
            ],
            database_operations=[
                migrations.RunPython(add_listing_columns, reverse_code=noop),
            ],
        ),

        # ── SpamFilter model ───────────────────────────────────────────────
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name="SpamFilter",
                    fields=[
                        ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False)),
                        ("filter_type", models.CharField(
                            choices=[("word", "Word"), ("regex", "Regex")],
                            default="word", max_length=20,
                        )),
                        ("word", models.CharField(blank=True, default="", max_length=255)),
                        ("pattern", models.CharField(
                            blank=True, default="", max_length=500,
                            help_text="Taqiqlangan so'z yoki regex pattern",
                        )),
                        ("action", models.CharField(
                            choices=[("reject", "Reject"), ("flag", "Flag")],
                            default="reject", max_length=20,
                        )),
                        ("is_active", models.BooleanField(default=True)),
                        ("created_at", models.DateTimeField(auto_now_add=True)),
                    ],
                    options={
                        "db_table": "spam_filters",
                        "ordering": ["-created_at"],
                        "verbose_name": "Spam Filter",
                        "verbose_name_plural": "Spam Filters",
                    },
                ),
            ],
            database_operations=[
                migrations.RunPython(create_spam_filters, reverse_code=noop),
            ],
        ),

        # ── PriceWatch model ───────────────────────────────────────────────
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name="PriceWatch",
                    fields=[
                        ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False)),
                        ("user", models.ForeignKey(
                            on_delete=django.db.models.deletion.CASCADE,
                            related_name="price_watches",
                            to=settings.AUTH_USER_MODEL,
                        )),
                        ("game", models.ForeignKey(
                            on_delete=django.db.models.deletion.CASCADE,
                            related_name="price_watches",
                            to="games.game",
                        )),
                        ("min_price", models.DecimalField(decimal_places=2, max_digits=15, null=True, blank=True)),
                        ("max_price", models.DecimalField(decimal_places=2, max_digits=15, null=True, blank=True)),
                        ("is_active", models.BooleanField(default=True)),
                        ("last_notified_at", models.DateTimeField(null=True, blank=True)),
                        ("created_at", models.DateTimeField(auto_now_add=True)),
                    ],
                    options={
                        "db_table": "price_watches",
                        "ordering": ["-created_at"],
                        "verbose_name": "Price Watch",
                        "verbose_name_plural": "Price Watches",
                    },
                ),
            ],
            database_operations=[
                migrations.RunPython(create_price_watches, reverse_code=noop),
            ],
        ),

        # ── Boost ordering index ───────────────────────────────────────────
        migrations.SeparateDatabaseAndState(
            state_operations=[],
            database_operations=[
                migrations.RunPython(create_boost_index, reverse_code=noop),
            ],
        ),
    ]
