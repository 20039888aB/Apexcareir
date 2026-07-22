from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F403,F401

DEBUG = False

_INSECURE_SECRET_KEYS = {
    "unsafe-secret-key",
    "change-me-in-production",
    "django-insecure-change-me",
}
if SECRET_KEY in _INSECURE_SECRET_KEYS or len(SECRET_KEY) < 50:  # noqa: F405
    raise ImproperlyConfigured(
        "Set a strong SECRET_KEY (50+ random characters) before running in production."
    )

API_PUBLIC_URL = env("API_PUBLIC_URL", default="").strip() or FRONTEND_APP_URL  # noqa: F405
BACKEND_PUBLIC_URL = env("BACKEND_PUBLIC_URL", default="").strip() or API_PUBLIC_URL

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=False)
SESSION_COOKIE_SECURE = env.bool("SESSION_COOKIE_SECURE", default=True)
CSRF_COOKIE_SECURE = env.bool("CSRF_COOKIE_SECURE", default=True)
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=0)
SECURE_HSTS_INCLUDE_SUBDOMAINS = SECURE_HSTS_SECONDS > 0
SECURE_HSTS_PRELOAD = env.bool("SECURE_HSTS_PRELOAD", default=False)
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

# Serve collected static files (Django admin CSS/JS, etc.) via Gunicorn on Render.
# Media uploads persist in Postgres (DatabaseMediaStorage) so free ephemeral disks don't lose images.
USE_DATABASE_MEDIA = env.bool("USE_DATABASE_MEDIA", default=True)
if USE_DATABASE_MEDIA:
    STORAGES = {
        "default": {
            "BACKEND": "apps.common.storage.DatabaseMediaStorage",
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
        },
    }
else:
    STORAGES = {
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
        },
    }
WHITENOISE_USE_FINDERS = False
WHITENOISE_AUTOREFRESH = False

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": env("LOG_LEVEL", default="INFO"),
    },
    "loggers": {
        "django.request": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
    },
}
