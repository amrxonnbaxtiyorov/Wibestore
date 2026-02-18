"""
WibeStore Backend - Core Mixins
Reusable view and serializer mixins for field selection and expansion.
"""

from rest_framework import serializers


class DynamicFieldsMixin:
    """
    A serializer mixin that allows callers to dynamically select fields via
    the ``?fields=`` query parameter.

    Usage::

        class MySerializer(DynamicFieldsMixin, serializers.ModelSerializer):
            ...

    Request::

        GET /api/v1/listings/?fields=id,title,price
    """

    def __init__(self, *args, **kwargs):
        fields = kwargs.pop("fields", None)
        super().__init__(*args, **kwargs)

        if fields is None:
            request = self.context.get("request")
            if request:
                fields_param = request.query_params.get("fields")
                if fields_param:
                    fields = [f.strip() for f in fields_param.split(",")]

        if fields is not None:
            allowed = set(fields)
            existing = set(self.fields)
            for field_name in existing - allowed:
                self.fields.pop(field_name)


class ExpandableFieldsMixin:
    """
    A serializer mixin that allows callers to expand related fields via
    the ``?expand=`` query parameter.

    Define ``expandable_fields`` on the serializer as a dict mapping
    field names to their serializer classes and kwargs.

    Usage::

        class ListingSerializer(ExpandableFieldsMixin, serializers.ModelSerializer):
            expandable_fields = {
                'seller': (UserSerializer, {'read_only': True}),
                'game':   (GameSerializer, {'read_only': True}),
            }

    Request::

        GET /api/v1/listings/?expand=seller,game
    """

    expandable_fields: dict = {}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        request = self.context.get("request")
        if not request:
            return

        expand_param = request.query_params.get("expand")
        if not expand_param:
            return

        expand_fields = [f.strip() for f in expand_param.split(",")]
        for field_name in expand_fields:
            if field_name in self.expandable_fields:
                serializer_class, kwargs = self.expandable_fields[field_name]
                self.fields[field_name] = serializer_class(**kwargs)


class BulkActionMixin:
    """
    A view mixin that supports bulk operations via ``?ids=1,2,3`` or POST body.
    """

    def get_ids_from_request(self, request) -> list:
        """Extract a list of IDs from query params or request body."""
        ids = request.query_params.get("ids")
        if ids:
            return [id.strip() for id in ids.split(",")]
        return request.data.get("ids", [])
