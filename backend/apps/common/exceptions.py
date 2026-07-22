import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        logger.exception("Unhandled API exception in %s", context.get("view"))
        # Always return a usable message for admin clients (SMTP/config failures are otherwise opaque on Render).
        detail = f"{exc.__class__.__name__}: {exc}".strip()
        if not detail or detail == ":":
            detail = "An unexpected error occurred."
        return Response(
            {"detail": detail},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if isinstance(response.data, dict):
        response.data["status_code"] = response.status_code
    else:
        response.data = {"detail": response.data, "status_code": response.status_code}
    return response
