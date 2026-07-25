"""Prefer IPv4 for SMTP on hosts (e.g. Render) where IPv6 routes are unreachable."""

from __future__ import annotations

import logging
import socket

logger = logging.getLogger(__name__)
_patched = False
_original_getaddrinfo = socket.getaddrinfo


def prefer_ipv4_for_smtp() -> None:
    """Patch socket.getaddrinfo once so SMTP dials IPv4 first."""
    global _patched
    if _patched:
        return

    def _getaddrinfo_ipv4_first(*args, **kwargs):
        results = _original_getaddrinfo(*args, **kwargs)
        ipv4 = [item for item in results if item[0] == socket.AF_INET]
        return ipv4 or results

    socket.getaddrinfo = _getaddrinfo_ipv4_first  # type: ignore[assignment]
    _patched = True
    logger.info("SMTP networking: preferring IPv4 address resolution.")
