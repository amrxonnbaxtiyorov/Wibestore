"""
Migration 0013: Add missing fields and models from deleted migration
(0007_add_boost_antiscam_pricewatch).

Fields added to Listing: is_boosted, boost_until, seller_ip
New models: SpamFilter, PriceWatch

All database operations use IF NOT EXISTS / IF EXISTS guards so this
migration is safe to run against both:
  - Production (Railway) where these columns/tables already exist
  - Fresh environments where they do not yet exist
"""

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("marketplace", "0012_add_boost_count"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("games", "0001_initial"),
    ]

    operations = [
        # ── Listing: is_boosted ────────────────────────────────────────────
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name="listing",
                    name="is_boosted",
                    field=models.BooleanField(default=False, db_index=True),
                ),
            ],
            database_operations=[
                migrations.RunSQL(
                    sql="""
                        DO $$
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1 FROM information_schema.columns
                                WHERE table_name='listings' AND column_name='is_boosted'
                            ) THEN
                                ALTER TABLE listings
                                    ADD COLUMN is_boosted boolean NOT NULL DEFAULT false;
                                CREATE INDEX IF NOT EXISTS listings_is_boosted_idx
                                    ON listings (is_boosted);
                            END IF;
                        END $$;
                    """,
                    reverse_sql="ALTER TABLE listings DROP COLUMN IF EXISTS is_boosted;",
                ),
            ],
        ),

        # ── Listing: boost_until ───────────────────────────────────────────
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name="listing",
                    name="boost_until",
                    field=models.DateTimeField(null=True, blank=True),
                ),
            ],
            database_operations=[
                migrations.RunSQL(
                    sql="""
                        DO $$
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1 FROM information_schema.columns
                                WHERE table_name='listings' AND column_name='boost_until'
                            ) THEN
                                ALTER TABLE listings
                                    ADD COLUMN boost_until timestamptz NULL;
                            END IF;
                        END $$;
                    """,
                    reverse_sql="ALTER TABLE listings DROP COLUMN IF EXISTS boost_until;",
                ),
            ],
        ),

        # ── Listing: seller_ip ─────────────────────────────────────────────
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name="listing",
                    name="seller_ip",
                    field=models.GenericIPAddressField(null=True, blank=True),
                ),
            ],
            database_operations=[
                migrations.RunSQL(
                    sql="""
                        DO $$
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1 FROM information_schema.columns
                                WHERE table_name='listings' AND column_name='seller_ip'
                            ) THEN
                                ALTER TABLE listings
                                    ADD COLUMN seller_ip inet NULL;
                            END IF;
                        END $$;
                    """,
                    reverse_sql="ALTER TABLE listings DROP COLUMN IF EXISTS seller_ip;",
                ),
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
                migrations.RunSQL(
                    sql="""
                        CREATE TABLE IF NOT EXISTS spam_filters (
                            id serial PRIMARY KEY,
                            filter_type varchar(20) NOT NULL DEFAULT 'word',
                            word varchar(255) NOT NULL DEFAULT '',
                            pattern varchar(500) NOT NULL DEFAULT '',
                            action varchar(20) NOT NULL DEFAULT 'reject',
                            is_active boolean NOT NULL DEFAULT true,
                            created_at timestamptz NOT NULL DEFAULT now()
                        );
                    """,
                    reverse_sql="DROP TABLE IF EXISTS spam_filters;",
                ),
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
                migrations.RunSQL(
                    sql="""
                        CREATE TABLE IF NOT EXISTS price_watches (
                            id serial PRIMARY KEY,
                            user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                            game_id integer NOT NULL REFERENCES games(id) ON DELETE CASCADE,
                            min_price numeric(15,2) NULL,
                            max_price numeric(15,2) NULL,
                            is_active boolean NOT NULL DEFAULT true,
                            last_notified_at timestamptz NULL,
                            created_at timestamptz NOT NULL DEFAULT now()
                        );
                    """,
                    reverse_sql="DROP TABLE IF EXISTS price_watches;",
                ),
            ],
        ),

        # ── Boost ordering index (from deleted 0008_add_boost_ordering_index) ──
        migrations.SeparateDatabaseAndState(
            state_operations=[],
            database_operations=[
                migrations.RunSQL(
                    sql="""
                        CREATE INDEX IF NOT EXISTS listings_status_db3073_idx
                            ON listings (status, is_boosted, is_premium, created_at DESC);
                    """,
                    reverse_sql="DROP INDEX IF EXISTS listings_status_db3073_idx;",
                ),
            ],
        ),
    ]
