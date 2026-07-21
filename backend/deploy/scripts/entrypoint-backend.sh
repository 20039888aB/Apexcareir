#!/bin/sh
set -eu

echo "Waiting for PostgreSQL..."
python <<'PY'
import os
import sys
import time

import psycopg2

database_url = os.environ.get("DATABASE_URL", "")
if not database_url:
    sys.exit("DATABASE_URL is not set")

deadline = time.time() + 60
last_error = None
while time.time() < deadline:
    try:
        psycopg2.connect(database_url).close()
        print("PostgreSQL is ready.")
        break
    except Exception as exc:  # noqa: BLE001
        last_error = exc
        time.sleep(2)
else:
    raise SystemExit(f"PostgreSQL did not become ready: {last_error}")
PY

echo "Applying migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

# Render free tier has no separate worker — run the email/report scheduler
# alongside gunicorn so queued mail and scheduled reports still flush.
if [ "${ENABLE_EMBEDDED_SCHEDULER:-True}" != "False" ] && [ "${ENABLE_EMBEDDED_SCHEDULER:-True}" != "false" ]; then
  echo "Starting embedded notification scheduler..."
  python manage.py run_scheduler --poll-seconds "${SCHEDULER_POLL_SECONDS:-60}" &
fi

echo "Starting application..."
exec "$@"
