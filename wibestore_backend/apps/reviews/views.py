"""
WibeStore Backend - Reviews Views
"""

import logging

from django.contrib.auth import get_user_model
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.payments.models import EscrowTransaction
from core.exceptions import BusinessLogicError

from .models import Review
from .serializers import CreateReviewSerializer, ReviewReplySerializer, ReviewSerializer
from .services import ReviewService

User = get_user_model()
logger = logging.getLogger("apps.reviews")


@extend_schema(tags=["Reviews"])
class UserReviewsView(generics.ListAPIView):
    """GET /api/v1/reviews/user/{user_id}/ — Reviews for a user."""

    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user_id = self.kwargs.get("user_id")
        return Review.objects.filter(
            reviewee_id=user_id, is_moderated=True
        ).select_related("reviewer", "reviewee")


@extend_schema(tags=["Reviews"])
class CreateReviewView(APIView):
    """POST /api/v1/reviews/ — Create a review for a completed transaction."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CreateReviewSerializer

    def post(self, request):
        serializer = CreateReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        escrow_id = serializer.validated_data["escrow_id"]

        try:
            escrow = EscrowTransaction.objects.get(
                id=escrow_id, buyer=request.user, status="confirmed"
            )
        except EscrowTransaction.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "Transaction not found or not completed."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            review = ReviewService.create_review(
                reviewer=request.user,
                reviewee=escrow.seller,
                listing=escrow.listing,
                escrow=escrow,
                rating=serializer.validated_data["rating"],
                comment=serializer.validated_data.get("comment", ""),
            )
        except BusinessLogicError as e:
            return Response(
                {"success": False, "error": {"message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "success": True,
                "message": "Review submitted successfully.",
                "data": ReviewSerializer(review).data,
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["Reviews"])
class ReviewReplyView(APIView):
    """POST /api/v1/reviews/{id}/reply/ — Reply to a review."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ReviewReplySerializer

    def post(self, request, pk):
        try:
            review = Review.objects.get(pk=pk)
        except Review.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "Review not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ReviewReplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            review = ReviewService.add_reply(
                review=review,
                seller=request.user,
                response_text=serializer.validated_data["reply"],
            )
        except BusinessLogicError as e:
            return Response(
                {"success": False, "error": {"message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "success": True,
                "message": "Reply added.",
                "data": ReviewSerializer(review).data,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Reviews"])
class ReviewDetailView(APIView):
    """PUT/DELETE /api/v1/reviews/{id}/ — Update or delete a review."""

    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, pk):
        try:
            review = Review.objects.get(pk=pk, reviewer=request.user)
        except Review.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "Review not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        rating = request.data.get("rating")
        comment = request.data.get("comment")

        if rating is not None:
            if not (1 <= int(rating) <= 5):
                return Response(
                    {"success": False, "error": {"message": "Rating must be between 1 and 5."}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            review.rating = int(rating)

        if comment is not None:
            review.comment = comment

        review.save(update_fields=["rating", "comment", "updated_at"])
        ReviewService.update_seller_rating(review.reviewee)

        return Response(
            {"success": True, "data": ReviewSerializer(review).data},
            status=status.HTTP_200_OK,
        )

    def delete(self, request, pk):
        try:
            review = Review.objects.get(pk=pk, reviewer=request.user)
        except Review.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "Review not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        ReviewService.delete_review(review)
        return Response(
            {"success": True, "message": "Review deleted."},
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Reviews"])
class ReviewHelpfulView(APIView):
    """POST /api/v1/reviews/{id}/helpful/ — Mark review as helpful."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            review = Review.objects.get(pk=pk)
        except Review.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "Review not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Simple toggle - no model field needed yet, just return success
        return Response(
            {"success": True, "message": "Marked as helpful."},
            status=status.HTTP_200_OK,
        )
