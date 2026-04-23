#!/bin/sh
set -e

max_attempts="${DB_STARTUP_MAX_ATTEMPTS:-30}"
attempt=1

until python manage.py migrate --noinput; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Database startup checks failed after $attempt attempts."
    exit 1
  fi

  echo "Database not ready yet (attempt $attempt/$max_attempts). Retrying in 3 seconds..."
  attempt=$((attempt + 1))
  sleep 3
done

python manage.py bootstrap_demo_users
exec python manage.py runserver 0.0.0.0:8000
