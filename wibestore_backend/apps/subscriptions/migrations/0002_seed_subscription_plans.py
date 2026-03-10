# Subscription planlari (Free, Premium, Pro) — admin "Premium/Pro berish" uchun

from decimal import Decimal

from django.db import migrations


def create_plans(apps, schema_editor):
    SubscriptionPlan = apps.get_model("subscriptions", "SubscriptionPlan")
    plans = [
        {
            "slug": "free",
            "name": "Free",
            "price_monthly": Decimal("0"),
            "price_yearly": Decimal("0"),
            "commission_rate": Decimal("0.10"),
            "features": ["10% commission", "Basic support", "Standard listing"],
            "is_premium": False,
            "is_pro": False,
            "sort_order": 0,
        },
        {
            "slug": "premium",
            "name": "Premium",
            "price_monthly": Decimal("50000"),
            "price_yearly": Decimal("600000"),
            "commission_rate": Decimal("0.08"),
            "features": ["8% commission", "Priority support", "Featured listings", "Analytics"],
            "is_premium": True,
            "is_pro": False,
            "sort_order": 1,
        },
        {
            "slug": "pro",
            "name": "Pro",
            "price_monthly": Decimal("100000"),
            "price_yearly": Decimal("1200000"),
            "commission_rate": Decimal("0.05"),
            "features": ["5% commission", "24/7 support", "Top featured listings", "Advanced analytics", "API access"],
            "is_premium": True,
            "is_pro": True,
            "sort_order": 2,
        },
    ]
    for p in plans:
        SubscriptionPlan.objects.get_or_create(
            slug=p["slug"],
            defaults={**p, "is_active": True},
        )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("subscriptions", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(create_plans, noop),
    ]
