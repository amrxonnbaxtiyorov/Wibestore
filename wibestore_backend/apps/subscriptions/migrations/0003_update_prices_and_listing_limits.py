# Update subscription prices and add monthly listing limits

from decimal import Decimal

from django.db import migrations, models


def update_plans(apps, schema_editor):
    SubscriptionPlan = apps.get_model("subscriptions", "SubscriptionPlan")

    # Free: 5 listings/month
    SubscriptionPlan.objects.filter(slug="free").update(
        monthly_listing_limit=5,
    )

    # Premium: 99,999 UZS/month, 30 listings/month
    SubscriptionPlan.objects.filter(slug="premium").update(
        price_monthly=Decimal("99999"),
        price_yearly=Decimal("999990"),
        monthly_listing_limit=30,
    )

    # Pro: 249,999 UZS/month, 70 listings/month
    SubscriptionPlan.objects.filter(slug="pro").update(
        price_monthly=Decimal("249999"),
        price_yearly=Decimal("2499990"),
        monthly_listing_limit=70,
    )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("subscriptions", "0002_seed_subscription_plans"),
    ]

    operations = [
        migrations.AddField(
            model_name="subscriptionplan",
            name="monthly_listing_limit",
            field=models.PositiveIntegerField(
                default=5,
                help_text="Maximum listings a user can create per month on this plan",
            ),
        ),
        migrations.RunPython(update_plans, noop),
    ]
