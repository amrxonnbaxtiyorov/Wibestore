"""
WibeStore Backend - Factory Boy Model Factories
"""

import uuid

import factory
from django.contrib.auth import get_user_model
from factory.django import DjangoModelFactory

User = get_user_model()


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User
        skip_postgeneration_save = True

    id = factory.LazyFunction(uuid.uuid4)
    email = factory.Sequence(lambda n: f"user{n}@test.com")
    username = factory.Sequence(lambda n: f"testuser{n}")
    full_name = factory.Faker("name")
    phone_number = factory.Sequence(lambda n: f"+99890000{n:04d}")
    is_active = True
    is_verified = False
    is_staff = False
    is_superuser = False
    balance = 0
    rating = 5.0

    @factory.lazy_attribute
    def password(self):
        return "TestPass123!"

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        password = kwargs.pop("password", "TestPass123!")
        user = super()._create(model_class, *args, **kwargs)
        user.set_password(password)
        user.save(update_fields=["password"])
        return user


class GameFactory(DjangoModelFactory):
    class Meta:
        model = "games.Game"

    name = factory.Sequence(lambda n: f"Test Game {n}")
    slug = factory.Sequence(lambda n: f"test-game-{n}")
    description = factory.Faker("paragraph")
    is_active = True
    sort_order = factory.Sequence(lambda n: n)
    color = "#3B82F6"


class CategoryFactory(DjangoModelFactory):
    class Meta:
        model = "games.Category"

    name = factory.Sequence(lambda n: f"Category {n}")
    slug = factory.Sequence(lambda n: f"category-{n}")


class ListingFactory(DjangoModelFactory):
    class Meta:
        model = "marketplace.Listing"

    seller = factory.SubFactory(UserFactory, is_verified=True)
    game = factory.SubFactory(GameFactory)
    title = factory.Sequence(lambda n: f"Test Listing {n}")
    description = factory.Faker("paragraph")
    price = factory.Faker("pydecimal", left_digits=6, right_digits=2, positive=True)
    status = "active"
    level = "50"
    rank = "Gold"


class ListingImageFactory(DjangoModelFactory):
    class Meta:
        model = "marketplace.ListingImage"

    listing = factory.SubFactory(ListingFactory)
    image = factory.django.ImageField(width=800, height=600)
    is_primary = False
    sort_order = 0


class PaymentMethodFactory(DjangoModelFactory):
    class Meta:
        model = "payments.PaymentMethod"

    name = "Visa Card"
    code = "visa"
    is_active = True


class TransactionFactory(DjangoModelFactory):
    class Meta:
        model = "payments.Transaction"

    user = factory.SubFactory(UserFactory)
    type = "deposit"
    amount = factory.Faker("pydecimal", left_digits=6, right_digits=2, positive=True)
    currency = "UZS"
    status = "pending"


class EscrowTransactionFactory(DjangoModelFactory):
    class Meta:
        model = "payments.EscrowTransaction"

    listing = factory.SubFactory(ListingFactory)
    buyer = factory.SubFactory(UserFactory, is_verified=True)
    seller = factory.SubFactory(UserFactory, is_verified=True)
    amount = factory.Faker("pydecimal", left_digits=6, right_digits=2, positive=True)
    status = "pending_payment"


class SubscriptionPlanFactory(DjangoModelFactory):
    class Meta:
        model = "subscriptions.SubscriptionPlan"

    name = factory.Sequence(lambda n: f"Plan {n}")
    slug = factory.Sequence(lambda n: f"plan-{n}")
    price_monthly = 0
    price_yearly = 0
    commission_rate = 10.0
    is_premium = False
    is_pro = False
    is_active = True


class ChatRoomFactory(DjangoModelFactory):
    class Meta:
        model = "messaging.ChatRoom"

    is_active = True

    @factory.post_generation
    def participants(self, create, extracted, **kwargs):
        if not create:
            return
        if extracted:
            for participant in extracted:
                self.participants.add(participant)


class MessageFactory(DjangoModelFactory):
    class Meta:
        model = "messaging.Message"

    room = factory.SubFactory(ChatRoomFactory)
    sender = factory.SubFactory(UserFactory)
    content = factory.Faker("sentence")
    message_type = "text"


class NotificationTypeFactory(DjangoModelFactory):
    class Meta:
        model = "notifications.NotificationType"

    name = factory.Sequence(lambda n: f"Notification Type {n}")
    code = factory.Sequence(lambda n: f"type_{n}")
    icon = "bell"


class NotificationFactory(DjangoModelFactory):
    class Meta:
        model = "notifications.Notification"

    user = factory.SubFactory(UserFactory)
    type = factory.SubFactory(NotificationTypeFactory)
    title = factory.Faker("sentence")
    message = factory.Faker("paragraph")
    is_read = False


class ReviewFactory(DjangoModelFactory):
    class Meta:
        model = "reviews.Review"

    reviewer = factory.SubFactory(UserFactory, is_verified=True)
    reviewee = factory.SubFactory(UserFactory, is_verified=True)
    listing = factory.SubFactory(ListingFactory)
    rating = 5
    comment = factory.Faker("paragraph")
    is_moderated = True


class ReportFactory(DjangoModelFactory):
    class Meta:
        model = "reports.Report"

    reporter = factory.SubFactory(UserFactory)
    reason = "fraud"
    description = factory.Faker("paragraph")
    status = "pending"
