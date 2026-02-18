"""
WibeStore Backend - Reports Views
"""

from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Report
from .serializers import CreateReportSerializer, ReportSerializer


@extend_schema(tags=["Reports"])
class CreateReportView(APIView):
    """POST /api/v1/reports/ — Submit a report."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CreateReportSerializer

    def post(self, request):
        serializer = CreateReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        report = Report.objects.create(
            reporter=request.user,
            reported_user_id=serializer.validated_data.get("reported_user_id"),
            reported_listing_id=serializer.validated_data.get("reported_listing_id"),
            reason=serializer.validated_data["reason"],
            description=serializer.validated_data["description"],
        )

        return Response(
            {
                "success": True,
                "message": "Report submitted. Our team will review it shortly.",
                "data": ReportSerializer(report).data,
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["Reports"])
class MyReportsView(generics.ListAPIView):
    """GET /api/v1/reports/ — User's reports."""

    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Report.objects.filter(reporter=self.request.user)
