# Architecture

This project is a monorepo for a semester medical chart database and medical history app.

Current stack:

- Backend: Django + Django REST Framework
- Frontend: React + TypeScript + Vite
- Database: PostgreSQL
- Local orchestration: Docker Compose

## Repository Structure

```text
.
├── backend/
│   ├── accounts/          # Auth API, demo users/data command
│   ├── config/            # Django settings and root URL config
│   ├── docker/            # Backend container entrypoint
│   ├── patients/          # Patient-domain models, serializers, views, URLs, tests
│   ├── Dockerfile
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/    # Shared authenticated layout and patient search
│   │   ├── features/      # Auth and patient API service modules
│   │   ├── pages/         # Routed pages and page tests
│   │   ├── services/      # Shared axios API client
│   │   └── test/          # Frontend test setup
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
├── docs/
│   ├── api-spec.md
│   ├── architecture.md
│   └── database-schema.md
├── docker-compose.yml
├── .env.example
└── README.md
```

## Backend Responsibilities

The Django backend owns:

- PostgreSQL schema through Django models and migrations.
- Token-based login/logout/current-user endpoints.
- Admin-only user-management endpoints.
- Role-aware patient-domain API permissions.
- Patient, visit, medication, diagnosis, allergy, and vital APIs.
- Demo user and demo patient-data bootstrapping.

Important backend files:

- `backend/config/settings.py`
  - Installed apps.
  - PostgreSQL environment variable configuration.
  - DRF token auth defaults.
  - CORS development setting.
- `backend/config/urls.py`
  - Root API routing.
- `backend/accounts/`
  - Login/logout/me API.
  - Demo data command.
- `backend/patients/`
  - Medical-record models, serializers, views, URLs, permissions, tests.

## Frontend Responsibilities

The React frontend owns:

- Login page.
- Authenticated layout with navigation and patient search.
- Patient list and patient create page.
- Patient detail dashboard with demographics, latest vitals, visits, medications, diagnoses, and allergies.
- Add/edit flows for visits, medications, diagnoses, allergies, and adding vitals to visits.
- API calls through an axios service layer.

Important frontend files:

- `frontend/src/App.tsx`
  - Defines the route structure and authenticated route guard.
- `frontend/src/services/api.ts`
  - Creates the axios client.
  - Reads `VITE_API_BASE_URL`.
  - Adds the DRF token from `localStorage` to requests.
- `frontend/src/features/auth/authService.ts`
  - Login/logout/current-user calls.
- `frontend/src/features/patients/patientService.ts`
  - Patient-domain API calls and TypeScript response/payload types.
- `frontend/src/pages/`
  - Page-level route components.

## Frontend Routes

Current routes:

```text
/login
/admin/users
/patients
/patients/new
/patients/:id
/patients/:id/visits/new
/patients/:id/visits/:recordId/edit
/patients/:id/visits/:recordId/vitals/new
/patients/:id/medications/new
/patients/:id/medications/:recordId/edit
/patients/:id/diagnoses/new
/patients/:id/diagnoses/:recordId/edit
/patients/:id/allergies/new
/patients/:id/allergies/:recordId/edit
```

Authenticated routes render inside `AuthenticatedLayout`. Public users are redirected to `/login`.

## API Communication Flow

Typical authenticated flow:

1. User logs in on the frontend.
2. Frontend calls `POST /api/auth/login/`.
3. Backend validates credentials and returns a DRF token plus user role data.
4. Frontend stores the token in `localStorage`.
5. Axios attaches `Authorization: Token <token>` to future requests.
6. Frontend calls patient-domain endpoints.
7. DRF checks authentication and Django model permissions.
8. Django reads/writes PostgreSQL through the ORM.
9. DRF serializers return JSON to the frontend.

Example patient detail flow:

```text
PatientDetail page
  -> getPatient(id)
  -> GET /api/patients/{id}/
  -> PatientDetailView
  -> PatientDetailSerializer
  -> PostgreSQL Patient + related records
  -> JSON response with medications, diagnoses, allergies, visits, latest_vitals
```

## Database Role

PostgreSQL is the active database for local development and Docker development.

Django connects using these environment variables:

```text
DB_NAME
DB_USER
DB_PASSWORD
DB_HOST
DB_PORT
```

In the full Docker workflow:

- PostgreSQL service name is `db`.
- Backend connects with `DB_HOST=db`.
- The database volume is `postgres_data`.

In the mixed local workflow:

- PostgreSQL still runs in Docker.
- Django runs on the host and connects to `localhost:5432`.

See `docs/database-schema.md` for the current schema.

## Docker Development Setup

`docker-compose.yml` defines:

- `db`
  - PostgreSQL 15.
  - Healthcheck using `pg_isready`.
  - Named volume for persistent local data.
- `backend`
  - Builds from `backend/Dockerfile`.
  - Waits for healthy database.
  - Runs migrations.
  - Runs `bootstrap_demo_users`.
  - Starts Django dev server on port `8000`.
- `frontend`
  - Builds from `frontend/Dockerfile`.
  - Runs Vite dev server on port `5173`.

Full stack command:

```bash
docker compose up --build
```

The app is available at:

```text
http://localhost:5173/
```

## Auth And RBAC

The current auth foundation uses:

- Django built-in user model.
- Django groups.
- Django model permissions.
- DRF token authentication.
- Custom `ViewModelPermissions` class that requires view permissions for GET/HEAD/OPTIONS.

Current demo roles:

- `Admin`
  - Can list, create, update, reset passwords for, and delete user accounts.
  - Cannot access patient records or related patient-domain endpoints.
- `Doctor`
  - Can view, add, and change patient-domain records.
- `Nurse`
  - Can view patient-domain records.
  - Cannot add or change restricted patient-domain records.

The frontend routes Admin users to `/admin/users` and hides patient navigation/search for that role. The backend also enforces the separation: Admin-only user-management endpoints require the `Admin` group, and patient-domain permissions explicitly reject Admin users.

The backend does not currently implement MFA, audit logging, or a full enterprise permission matrix.

## Testing

Backend tests:

```bash
cd backend
source .venv/bin/activate
python3 manage.py test accounts patients
python3 manage.py makemigrations --check --dry-run
```

Frontend tests and checks:

```bash
cd frontend
npm run test
npm run build
npm run lint
```

## Current Limitations

- No patient update endpoint is exposed.
- Delete endpoints are not exposed for patient-domain records.
- MFA is represented only by `mfa_required: false` in login responses.
- Audit logging is not implemented yet.
- Visit staff attribution is stored as text, not linked to user accounts.
- CORS is open in development settings.
