"""
WibeStore Backend - Common Serializers
"""

from rest_framework import serializers


class EmptySerializer(serializers.Serializer):
    """Empty serializer for endpoints that don't require input."""
    pass


class SuccessResponseSerializer(serializers.Serializer):
    """Serializer for success responses."""

    success = serializers.BooleanField(default=True)
    message = serializers.CharField()


class ErrorResponseSerializer(serializers.Serializer):
    """Serializer for error responses."""

    success = serializers.BooleanField(default=False)
    error = serializers.DictField()
