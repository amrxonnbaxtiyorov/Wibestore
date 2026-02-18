"""
WibeStore Backend - Reports Serializers
"""

from rest_framework import serializers

from apps.accounts.serializers import UserPublicSerializer

from .models import Report


class ReportSerializer(serializers.ModelSerializer):
    reporter = UserPublicSerializer(read_only=True)

    class Meta:
        model = Report
        fields = [
            "id",
            "reporter",
            "reported_user",
            "reported_listing",
            "reason",
            "description",
            "evidence",
            "status",
            "resolution_note",
            "resolved_at",
            "created_at",
        ]
        read_only_fields = [
            "id", "reporter", "status", "resolution_note", "resolved_at", "created_at"
        ]


class CreateReportSerializer(serializers.Serializer):
    reported_user_id = serializers.UUIDField(required=False)
    reported_listing_id = serializers.UUIDField(required=False)
    reason = serializers.CharField()
    description = serializers.CharField()
