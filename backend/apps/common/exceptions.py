import logging

from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        logger.exception("Unhandled API exception in %s", context.get("view"))
        detail = "An unexpected error occurred."
        if settings.DEBUG:
            detail = f"{exc.__class__.__name__}: {exc}"
        return Response(
            {"detail": detail},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if isinstance(response.data, dict):
        response.data["status_code"] = response.status_code
    else:
        response.data = {"detail": response.data, "status_code": response.status_code}
    return response
