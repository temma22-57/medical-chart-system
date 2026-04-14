Medical Chart System

Class project for a medical chart database and medical history system.

## Local Development

The local development workflow is:

- PostgreSQL runs in Docker.
- Django runs on the host in a Python virtual environment.
- React/Vite runs on the host with npm.

Run commands from the repo root unless a step says to `cd` into a subdirectory.

## Prerequisites

- git
- Docker and Docker Compose
- python3
- python3-venv
- python3-pip
- node
- npm

## Environment Setup

Create a local `.env` file from the example:

```bash
cp .env.example .env
```

Default local values:

```bash
DJANGO_SECRET_KEY=django-insecure-local-development-key
DJANGO_DEBUG=True

DB_NAME=medical_chart
DB_USER=medical_chart_user
DB_PASSWORD=medical_chart_password
DB_HOST=localhost
DB_PORT=5432
```

Do not commit `.env`; it is ignored by git.

## First Run

Start PostgreSQL:

```bash
docker compose up -d db
```

Set up and run the backend:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt
python3 manage.py migrate
python3 manage.py bootstrap_demo_users
python3 manage.py runserver
```

Set up and run the frontend in another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173/
```

## Re-running After Initial Setup

Backend terminal:

```bash
docker compose up -d db
cd backend
source .venv/bin/activate
python3 manage.py migrate
python3 manage.py runserver
```

Frontend terminal:

```bash
cd frontend
npm run dev
```

Open:

```text
http://localhost:5173/
```

## Build And Checks

Backend tests:

```bash
cd backend
source .venv/bin/activate
python3 manage.py test accounts patients
python3 manage.py makemigrations --check --dry-run
```

Frontend build and lint:

```bash
cd frontend
npm run build
npm run lint
```

## Database Notes

Django is configured to use PostgreSQL by default through these environment variables:

- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_HOST`
- `DB_PORT`

The compose file publishes PostgreSQL to `localhost:5432` by default so the host-run Django server can connect to it.

## Authentication And Roles

The API uses Django's built-in user model, Django Groups, Django model permissions, and DRF token authentication.

Create local demo roles and users after migrations:

```bash
cd backend
source .venv/bin/activate
python3 manage.py bootstrap_demo_users
```

Demo users:

```text
doctor / doctorpass
nurse / nursepass
```

Role behavior in the current prototype:

- Unauthenticated users cannot access patient record APIs.
- Doctor users can view patient records and create patient/medical-record data.
- Nurse users can view patient records but cannot create restricted medical-record data.

Auth endpoints:

```text
POST /api/auth/login/
POST /api/auth/logout/
GET /api/auth/me/
```

The login response includes `mfa_required: false`. A later TOTP-based MFA step can plug into this login flow by returning `mfa_required: true` before issuing or fully activating a token.
