"""Backfill trade_code for existing EscrowTransactions."""

import random
from django.db import migrations


def backfill_trade_codes(apps, schema_editor):
    EscrowTransaction = apps.get_model("payments", "EscrowTransaction")
    used_codes = set()

    for escrow in EscrowTransaction.objects.filter(trade_code__isnull=True):
        for _ in range(20):
            code = f"WB-TRD-{random.randint(10000, 99999)}"
            if code not in used_codes:
                used_codes.add(code)
                escrow.trade_code = code
                escrow.save(update_fields=["trade_code"])
                break


class Migration(migrations.Migration):
    dependencies = [
        ("payments", "0007_add_trade_code"),
    ]

    operations = [
        migrations.RunPython(backfill_trade_codes, migrations.RunPython.noop),
    ]
