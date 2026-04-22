Medical Chart System

Class project for a medical chart database and medical history system.

## Project Documentation

- [Architecture](docs/architecture.md)
- [API specification](docs/api-spec.md)
- [Database schema](docs/database-schema.md)

## Local Development

The simplest repeatable development workflow is:

- PostgreSQL, Django, and React/Vite run together with Docker Compose.

The mixed host workflow is still supported:

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

Create a local `.env` file from the example if you want to override the default local settings:

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

BACKEND_PORT=8000
FRONTEND_PORT=5173
VITE_API_BASE_URL=http://localhost:8000/api
```

Do not commit `.env`; it is ignored by git.

## Full Docker Run

Start the full stack:

```bash
docker compose up --build
```

Open:

```text
http://localhost:5173/
```

The backend is available at:

```text
http://localhost:8000/
```

If ports `8000` or `5173` are already in use, set `BACKEND_PORT` and `FRONTEND_PORT` in `.env`. If `BACKEND_PORT` changes, update `VITE_API_BASE_URL` to match.

The backend container automatically runs migrations and loads demo users plus demo patient data at startup.

Demo users:

```text
admin / adminpass
doctor / doctorpass
nurse / nursepass
```

Stop the stack:

```bash
docker compose down
```

To remove the local PostgreSQL volume and reset demo data:

```bash
docker compose down -v
```

## Mixed Local First Run

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

Backend regression tests use Django's test runner and the configured PostgreSQL connection. Start the database first:

```bash
docker compose up -d db
```

Then run:

```bash
cd backend
source .venv/bin/activate
python3 manage.py test accounts patients
python3 manage.py makemigrations --check --dry-run
```

Frontend build, lint, and smoke tests:

```bash
cd frontend
npm run build
npm run lint
npm run test
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

The current app-level roles are:

- `Admin`
- `Doctor`
- `Nurse`

Create local demo roles, users, patients, and related medical records after migrations:

```bash
cd backend
source .venv/bin/activate
python3 manage.py bootstrap_demo_users
```

Demo users:

```text
admin / adminpass
doctor / doctorpass
nurse / nursepass
```

Role behavior in the current prototype:

- Unauthenticated users cannot access patient record APIs.
- Admin users can manage user accounts but cannot access patient record APIs or related patient data.
- Doctor users can view, create, and update patient-domain records.
- Nurse users can view patient-domain records, create visits, create/update visit vitals, and create/update their own visit and diagnosis notes, but cannot create medications, allergies, diagnoses, or other restricted medical-record data.

Admin user management supports:

- listing users
- creating Admin, Doctor, and Nurse users
- updating a user's role/profile fields
- resetting a user's password
- deleting users, except the currently signed-in admin account

Auth endpoints:

```text
POST /api/auth/login/
POST /api/auth/logout/
GET /api/auth/me/
GET /api/auth/users/
POST /api/auth/users/
GET /api/auth/users/{id}/
PATCH /api/auth/users/{id}/
DELETE /api/auth/users/{id}/
POST /api/auth/users/{id}/reset-password/
```

Only Admin users can access the `/api/auth/users/` user-management endpoints.

The login response includes `mfa_required: false`. A later TOTP-based MFA step can plug into this login flow by returning `mfa_required: true` before issuing or fully activating a token.
