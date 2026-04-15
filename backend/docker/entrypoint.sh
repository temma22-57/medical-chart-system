#!/bin/sh
set -e

python manage.py migrate
python manage.py bootstrap_demo_users
python manage.py runserver 0.0.0.0:8000
