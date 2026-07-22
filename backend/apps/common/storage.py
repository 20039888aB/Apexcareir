from __future__ import annotations

import mimetypes

from django.core.files.base import ContentFile
from django.core.files.storage import Storage
from django.db import transaction
from django.utils.deconstruct import deconstructible


@deconstructible
class DatabaseMediaStorage(Storage):
    """Persist uploaded media in Postgres so Render free disks can lose files safely."""

    def _get_model(self):
        from apps.common.models import MediaAsset

        return MediaAsset

    def _normalize_name(self, name: str) -> str:
        return (name or "").lstrip("/")

    def _open(self, name, mode="rb"):
        MediaAsset = self._get_model()
        asset = MediaAsset.objects.filter(name=self._normalize_name(name)).first()
        if asset is None:
            raise FileNotFoundError(name)
        return ContentFile(bytes(asset.content), name=asset.name)

    def _save(self, name, content):
        MediaAsset = self._get_model()
        normalized = self._normalize_name(self.get_available_name(name))
        if hasattr(content, "chunks"):
            payload = b"".join(chunk for chunk in content.chunks())
        else:
            payload = content.read()
            if isinstance(payload, str):
                payload = payload.encode("utf-8")

        content_type = getattr(content, "content_type", None) or mimetypes.guess_type(normalized)[0] or "application/octet-stream"
        with transaction.atomic():
            MediaAsset.objects.update_or_create(
                name=normalized,
                defaults={
                    "content": payload,
                    "content_type": content_type,
                    "size": len(payload),
                },
            )
        return normalized

    def delete(self, name):
        MediaAsset = self._get_model()
        MediaAsset.objects.filter(name=self._normalize_name(name)).delete()

    def exists(self, name):
        MediaAsset = self._get_model()
        return MediaAsset.objects.filter(name=self._normalize_name(name)).exists()

    def size(self, name):
        MediaAsset = self._get_model()
        asset = MediaAsset.objects.filter(name=self._normalize_name(name)).only("size").first()
        if asset is None:
            raise FileNotFoundError(name)
        return asset.size

    def url(self, name):
        from django.conf import settings

        normalized = self._normalize_name(name)
        base = (
            getattr(settings, "API_PUBLIC_URL", None)
            or getattr(settings, "BACKEND_PUBLIC_URL", None)
            or ""
        ).rstrip("/")
        path = f"/api/v1/media/{normalized}"
        return f"{base}{path}" if base else path

    def path(self, name):
        # Not a real filesystem path — callers must use .open() instead.
        raise NotImplementedError("Database media storage does not provide filesystem paths.")
