import os

_settings_env = os.environ.get("DJANGO_ENV", "development").strip().lower()

if _settings_env == "production":
    from .production import *  # noqa: F403,F401
else:
    from .development import *  # noqa: F403,F401
