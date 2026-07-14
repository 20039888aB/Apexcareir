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

echo "Starting application..."
exec "$@"
