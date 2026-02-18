"""
WibeStore Backend - Reviews Serializers
"""

from rest_framework import serializers

from apps.accounts.serializers import UserPublicSerializer

from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    reviewer = UserPublicSerializer(read_only=True)
    reviewee = UserPublicSerializer(read_only=True)

    class Meta:
        model = Review
        fields = [
            "id",
            "reviewer",
            "reviewee",
            "listing",
            "escrow",
            "rating",
            "comment",
            "is_moderated",
            "reply",
            "reply_at",
            "created_at",
        ]
        read_only_fields = [
            "id", "reviewer", "is_moderated", "reply", "reply_at", "created_at"
        ]


class CreateReviewSerializer(serializers.Serializer):
    escrow_id = serializers.UUIDField()
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(required=False, default="")


class ReviewReplySerializer(serializers.Serializer):
    reply = serializers.CharField()
