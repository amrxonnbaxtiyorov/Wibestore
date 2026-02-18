"""
WibeStore Backend - Reviews Tests
"""

import pytest
from django.urls import reverse
from rest_framework import status

from tests.factories import EscrowTransactionFactory, ReviewFactory, UserFactory


@pytest.mark.django_db
class TestUserReviews:
    """Tests for viewing a user's reviews."""

    def test_get_user_reviews(self, api_client):
        review = ReviewFactory()
        url = reverse("reviews:user-reviews", kwargs={"user_id": review.reviewee.id})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestCreateReview:
    """Tests for creating a review."""

    def test_create_review_after_escrow(self, auth_client, verified_user):
        seller = UserFactory(is_verified=True)
        escrow = EscrowTransactionFactory(
            buyer=verified_user,
            seller=seller,
            status="confirmed",
        )
        url = reverse("reviews:create-review")
        data = {
            "escrow_id": str(escrow.id),
            "rating": 5,
            "comment": "Great seller!",
        }
        response = auth_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED

    def test_create_review_unauthenticated(self, api_client):
        url = reverse("reviews:create-review")
        response = api_client.post(url, {}, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestReviewReply:
    """Tests for replying to a review."""

    def test_reply_to_review(self, auth_client, verified_user):
        review = ReviewFactory(reviewee=verified_user)
        url = reverse("reviews:review-reply", kwargs={"pk": review.pk})
        data = {"reply": "Thank you for the kind words!"}
        response = auth_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_200_OK
