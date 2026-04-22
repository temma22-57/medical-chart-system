# API Specification

This document describes the API endpoints that currently exist in the Django REST Framework backend.

Base URL for local development:

```text
http://localhost:8000/api
```

Authentication uses DRF token authentication. Authenticated requests should include:

```http
Authorization: Token <token>
```

## Roles And Permissions

The project uses Django users, groups, and model permissions.

- Unauthenticated users cannot access patient medical-record APIs.
- `Admin` users can manage user accounts but cannot access patient medical-record APIs.
- `Doctor` users can view, create, and update patient-domain records covered by the current permission setup.
- `Nurse` users can view patient-domain records and can add/change their own visit notes, but do not have add/change permissions for other restricted patient-domain records.
- Login is public.
- Logout and current-user lookup require authentication.

The demo data command creates:

```text
admin / adminpass
doctor / doctorpass
nurse / nursepass
```

## Auth Endpoints

### POST `/api/auth/login/`

Logs in a user and returns an API token.

Auth required: no

Request:

```json
{
  "username": "doctor",
  "password": "doctorpass"
}
```

Response:

```json
{
  "token": "token-value",
  "user": {
    "id": 1,
    "username": "doctor",
    "first_name": "",
    "last_name": "",
    "email": "",
    "roles": ["Doctor"]
  },
  "mfa_required": false
}
```

Notes:

- Invalid credentials return `400 Bad Request`.
- MFA is not implemented yet; the response currently always includes `mfa_required: false`.

### POST `/api/auth/logout/`

Deletes the current user's token.

Auth required: yes

Request body: none

Response:

```text
204 No Content
```

### GET `/api/auth/me/`

Returns the current authenticated user.

Auth required: yes

Response:

```json
{
  "id": 1,
  "username": "doctor",
  "first_name": "",
  "last_name": "",
  "email": "",
  "roles": ["Doctor"]
}
```

## Admin User-Management Endpoints

These endpoints are available only to users in the `Admin` group.

Admin users do not receive patient-domain permissions and are explicitly blocked by patient endpoint permissions.

### GET `/api/auth/users/`

Lists application users.

Auth required: yes

Role required: `Admin`

Response:

```json
[
  {
    "id": 1,
    "username": "doctor",
    "first_name": "",
    "last_name": "",
    "email": "",
    "roles": ["Doctor"]
  }
]
```

### POST `/api/auth/users/`

Creates an application user and assigns one role.

Auth required: yes

Role required: `Admin`

Request:

```json
{
  "username": "newdoctor",
  "password": "doctorpass",
  "first_name": "New",
  "last_name": "Doctor",
  "email": "newdoctor@example.com",
  "role": "Doctor"
}
```

Allowed roles:

```text
Admin
Doctor
Nurse
```

Response: created user object.

### GET `/api/auth/users/{id}/`

Retrieves one application user.

Auth required: yes

Role required: `Admin`

Response: user object.

### PUT/PATCH `/api/auth/users/{id}/`

Updates user profile fields and/or role.

Auth required: yes

Role required: `Admin`

Patch request:

```json
{
  "role": "Nurse",
  "email": "updated@example.com"
}
```

Response: updated user object.

### POST `/api/auth/users/{id}/reset-password/`

Resets a user's password and deletes existing API tokens for that user.

Auth required: yes

Role required: `Admin`

Request:

```json
{
  "password": "new-password"
}
```

Response:

```text
204 No Content
```

### DELETE `/api/auth/users/{id}/`

Deletes a user account.

Auth required: yes

Role required: `Admin`

Response:

```text
204 No Content
```

Notes:

- Admins cannot delete their own account through this endpoint.

## Patient Endpoints

### GET `/api/patients/`

Lists patients.

Auth required: yes

Permission required: `patients.view_patient`

Admin role behavior: blocked even if patient permissions are accidentally assigned.

Optional query params:

```text
search=smith
```

Search matches first name and last name terms case-insensitively.

Response:

```json
[
  {
    "id": 1,
    "first_name": "Jordan",
    "last_name": "Kim",
    "date_of_birth": "1984-02-14",
    "phone": "555-0101",
    "primary_language": "English",
    "notes": "Demo patient with hypertension follow-up history.",
    "created_at": "2026-04-15T04:18:00Z",
    "updated_at": "2026-04-15T04:18:00Z"
  }
]
```

### POST `/api/patients/`

Creates a patient.

Auth required: yes

Permission required: `patients.add_patient`

Request:

```json
{
  "first_name": "Jordan",
  "last_name": "Kim",
  "date_of_birth": "1984-02-14",
  "phone": "555-0101",
  "primary_language": "English",
  "notes": "Optional demographic or chart note."
}
```

Response:

```json
{
  "id": 1,
  "first_name": "Jordan",
  "last_name": "Kim",
  "date_of_birth": "1984-02-14",
  "phone": "555-0101",
  "primary_language": "English",
  "notes": "Optional demographic or chart note.",
  "created_at": "2026-04-15T04:18:00Z",
  "updated_at": "2026-04-15T04:18:00Z"
}
```

Notes:

- Exact duplicate patient records are rejected.
- The duplicate check compares first name, last name, date of birth, and phone.
- Patients with the same first and last name are allowed when date of birth or phone differs.

### GET `/api/patients/{id}/`

Retrieves a patient detail record with related medications, diagnoses, allergies, visits, visit vitals, and latest vitals.

Auth required: yes

Permission required: `patients.view_patient`

Response:

```json
{
  "id": 1,
  "first_name": "Jordan",
  "last_name": "Kim",
  "date_of_birth": "1984-02-14",
  "phone": "555-0101",
  "primary_language": "English",
  "notes": "Demo patient with hypertension follow-up history.",
  "created_at": "2026-04-15T04:18:00Z",
  "updated_at": "2026-04-15T04:18:00Z",
  "medications": [
    {
      "id": 1,
      "patient": 1,
      "name": "Lisinopril",
      "dosage": "10 mg",
      "frequency": "Daily",
      "duration": "Ongoing",
      "created_at": "2026-04-15T04:18:00Z",
      "updated_at": "2026-04-15T04:18:00Z"
    }
  ],
  "diagnoses": [
    {
      "id": 1,
      "patient": 1,
      "name": "Hypertension",
      "status": "current",
      "date_diagnosed": "2026-03-15",
      "diagnosis_code": "I10",
      "provider_name": "Dr. Morgan Patel",
      "resolution_date": null,
      "notes": "Monitor blood pressure and medication response.",
      "created_at": "2026-04-15T04:18:00Z",
      "updated_at": "2026-04-15T04:18:00Z"
    }
  ],
  "allergies": [
    {
      "id": 1,
      "patient": 1,
      "substance": "Penicillin",
      "reaction": "Rash",
      "created_at": "2026-04-15T04:18:00Z",
      "updated_at": "2026-04-15T04:18:00Z"
    }
  ],
  "visits": [
    {
      "id": 1,
      "patient": 1,
      "visit_date": "2026-04-10",
      "primary_care_physician": "Dr. Morgan Patel",
      "staff_assigned": "Nurse Lee",
      "notes": [
        {
          "id": 1,
          "visit": 1,
          "author": 2,
          "author_username": "doctor",
          "author_display_name": "doctor",
          "content": "Blood pressure check and medication review.",
          "can_edit": false,
          "created_at": "2026-04-15T04:18:00Z",
          "updated_at": "2026-04-15T04:18:00Z"
        }
      ],
      "vitals": [
        {
          "id": 1,
          "visit": 1,
          "patient": 1,
          "height": "70.00",
          "weight": "181.50",
          "blood_pressure": "128/82",
          "heart_rate": 72,
          "temperature": "98.60",
          "collected_at": "2026-04-10T15:00:00Z",
          "created_at": "2026-04-15T04:18:00Z",
          "updated_at": "2026-04-15T04:18:00Z"
        }
      ],
      "created_at": "2026-04-15T04:18:00Z",
      "updated_at": "2026-04-15T04:18:00Z"
    }
  ],
  "latest_vitals": {
    "id": 1,
    "visit": 1,
    "patient": 1,
    "height": "70.00",
    "weight": "181.50",
    "blood_pressure": "128/82",
    "heart_rate": 72,
    "temperature": "98.60",
    "collected_at": "2026-04-10T15:00:00Z",
    "created_at": "2026-04-15T04:18:00Z",
    "updated_at": "2026-04-15T04:18:00Z"
  }
}
```

Current limitation:

- There is no patient update or delete endpoint in the current API.

### GET `/api/patients/{id}/latest-vitals/`

Returns the latest vitals for a patient.

Auth required: yes

Permission required: `patients.view_vital`

Response:

```json
{
  "id": 1,
  "visit": 1,
  "patient": 1,
  "height": "70.00",
  "weight": "181.50",
  "blood_pressure": "128/82",
  "heart_rate": 72,
  "temperature": "98.60",
  "collected_at": "2026-04-10T15:00:00Z",
  "created_at": "2026-04-15T04:18:00Z",
  "updated_at": "2026-04-15T04:18:00Z"
}
```

Notes:

- Latest vitals are selected by `visit.visit_date`, then `collected_at`, then `id`, all descending.
- If no vitals exist for the patient, the endpoint returns `404 Not Found`.

## Visit Endpoints

### GET `/api/patients/{patient_id}/visits/`

Lists visits for a patient.

Auth required: yes

Permission required: `patients.view_visit`

Response:

```json
[
  {
    "id": 1,
    "patient": 1,
    "visit_date": "2026-04-10",
    "primary_care_physician": "Dr. Morgan Patel",
    "staff_assigned": "Nurse Lee",
    "notes": [
      {
        "id": 1,
        "visit": 1,
        "author": 2,
        "author_username": "doctor",
        "author_display_name": "doctor",
        "content": "Blood pressure check and medication review.",
        "can_edit": true,
        "created_at": "2026-04-15T04:18:00Z",
        "updated_at": "2026-04-15T04:18:00Z"
      }
    ],
    "vitals": [],
    "created_at": "2026-04-15T04:18:00Z",
    "updated_at": "2026-04-15T04:18:00Z"
  }
]
```

### POST `/api/patients/{patient_id}/visits/`

Creates a visit for a patient.

Auth required: yes

Permission required: `patients.add_visit`

Request:

```json
{
  "visit_date": "2026-04-10",
  "primary_care_physician": "Dr. Morgan Patel",
  "staff_assigned": "Nurse Lee"
}
```

Response: visit object.

Notes:

- Visit note text is stored through the visit-note endpoints, not on the visit record itself.

### GET `/api/visits/{id}/`

Retrieves one visit.

Auth required: yes

Permission required: `patients.view_visit`

Response: visit object with nested `vitals`.

### PUT/PATCH `/api/visits/{id}/`

Updates one visit.

Auth required: yes

Permission required: `patients.change_visit`

Patch request:

```json
{
  "staff_assigned": "Nurse Lee"
}
```

Response: updated visit object.

## Visit Note Endpoints

Visit notes are authored records linked to both a visit and a user account. The current implementation allows one note per user per visit.

### GET `/api/visits/{visit_id}/notes/`

Lists notes for a visit.

Auth required: yes

Permission required: `patients.view_visitnote`

Response:

```json
[
  {
    "id": 1,
    "visit": 1,
    "author": 2,
    "author_username": "doctor",
    "author_display_name": "doctor",
    "content": "Blood pressure check and medication review.",
    "can_edit": true,
    "created_at": "2026-04-15T04:18:00Z",
    "updated_at": "2026-04-15T04:18:00Z"
  },
  {
    "id": 2,
    "visit": 1,
    "author": 3,
    "author_username": "nurse",
    "author_display_name": "nurse",
    "content": "Reviewed home blood pressure log with patient.",
    "can_edit": false,
    "created_at": "2026-04-15T04:20:00Z",
    "updated_at": "2026-04-15T04:20:00Z"
  }
]
```

### POST `/api/visits/{visit_id}/notes/`

Creates the authenticated user's note for a visit.

Auth required: yes

Permission required: `patients.add_visitnote`

Request:

```json
{
  "content": "Patient reports taking medication as directed."
}
```

Response: visit note object.

Notes:

- If the authenticated user already has a note for the visit, the endpoint returns `400 Bad Request`.

### GET `/api/visit-notes/{id}/`

Retrieves one visit note.

Auth required: yes

Permission required: `patients.view_visitnote`

Response: visit note object.

### PUT/PATCH `/api/visit-notes/{id}/`

Updates one visit note.

Auth required: yes

Permission required: `patients.change_visitnote`

Author rule: users can update only their own note. Updating another user's note returns `403 Forbidden`.

Patch request:

```json
{
  "content": "Updated visit note text."
}
```

Response: updated visit note object.

## Medication Endpoints

### GET `/api/patients/{patient_id}/medications/`

Lists medications for a patient.

Auth required: yes

Permission required: `patients.view_medication`

Response:

```json
[
  {
    "id": 1,
    "patient": 1,
    "name": "Lisinopril",
    "dosage": "10 mg",
    "frequency": "Daily",
    "duration": "Ongoing",
    "created_at": "2026-04-15T04:18:00Z",
    "updated_at": "2026-04-15T04:18:00Z"
  }
]
```

### POST `/api/patients/{patient_id}/medications/`

Creates a medication for a patient.

Auth required: yes

Permission required: `patients.add_medication`

Request:

```json
{
  "name": "Lisinopril",
  "dosage": "10 mg",
  "frequency": "Daily",
  "duration": "Ongoing"
}
```

Response: medication object.

### GET `/api/medications/{id}/`

Retrieves one medication.

Auth required: yes

Permission required: `patients.view_medication`

Response: medication object.

### PUT/PATCH `/api/medications/{id}/`

Updates one medication.

Auth required: yes

Permission required: `patients.change_medication`

Patch request:

```json
{
  "frequency": "Twice daily",
  "duration": "30 days"
}
```

Response: updated medication object.

## Diagnosis Endpoints

### GET `/api/patients/{patient_id}/diagnoses/`

Lists diagnoses for a patient.

Auth required: yes

Permission required: `patients.view_diagnosis`

Ordering: current diagnoses first, then newest diagnosis date first.

Response:

```json
[
  {
    "id": 1,
    "patient": 1,
    "name": "Hypertension",
    "status": "current",
    "date_diagnosed": "2026-03-15",
    "diagnosis_code": "I10",
    "provider_name": "Dr. Morgan Patel",
    "resolution_date": null,
    "notes": "Monitor blood pressure and medication response.",
    "created_at": "2026-04-15T04:18:00Z",
    "updated_at": "2026-04-15T04:18:00Z"
  }
]
```

### POST `/api/patients/{patient_id}/diagnoses/`

Creates a diagnosis for a patient.

Auth required: yes

Permission required: `patients.add_diagnosis`

Request:

```json
{
  "name": "Hypertension",
  "status": "current",
  "date_diagnosed": "2026-03-15",
  "diagnosis_code": "I10",
  "provider_name": "Dr. Morgan Patel",
  "resolution_date": null,
  "notes": "Monitor blood pressure and medication response."
}
```

Response: diagnosis object.

### GET `/api/diagnoses/{id}/`

Retrieves one diagnosis.

Auth required: yes

Permission required: `patients.view_diagnosis`

Response: diagnosis object.

### PUT/PATCH `/api/diagnoses/{id}/`

Updates one diagnosis.

Auth required: yes

Permission required: `patients.change_diagnosis`

Patch request:

```json
{
  "status": "resolved",
  "resolution_date": "2026-04-20"
}
```

Response: updated diagnosis object.

## Allergy Endpoints

### GET `/api/patients/{patient_id}/allergies/`

Lists allergies for a patient.

Auth required: yes

Permission required: `patients.view_allergy`

Response:

```json
[
  {
    "id": 1,
    "patient": 1,
    "substance": "Penicillin",
    "reaction": "Rash",
    "created_at": "2026-04-15T04:18:00Z",
    "updated_at": "2026-04-15T04:18:00Z"
  }
]
```

### POST `/api/patients/{patient_id}/allergies/`

Creates an allergy for a patient.

Auth required: yes

Permission required: `patients.add_allergy`

Request:

```json
{
  "substance": "Penicillin",
  "reaction": "Rash"
}
```

Response: allergy object.

### GET `/api/allergies/{id}/`

Retrieves one allergy.

Auth required: yes

Permission required: `patients.view_allergy`

Response: allergy object.

### PUT/PATCH `/api/allergies/{id}/`

Updates one allergy.

Auth required: yes

Permission required: `patients.change_allergy`

Patch request:

```json
{
  "reaction": "Severe rash"
}
```

Response: updated allergy object.

## Vital Endpoints

### GET `/api/visits/{visit_id}/vitals/`

Lists vitals for a visit.

Auth required: yes

Permission required: `patients.view_vital`

Response:

```json
[
  {
    "id": 1,
    "visit": 1,
    "patient": 1,
    "height": "70.00",
    "weight": "181.50",
    "blood_pressure": "128/82",
    "heart_rate": 72,
    "temperature": "98.60",
    "collected_at": "2026-04-10T15:00:00Z",
    "created_at": "2026-04-15T04:18:00Z",
    "updated_at": "2026-04-15T04:18:00Z"
  }
]
```

### POST `/api/visits/{visit_id}/vitals/`

Creates vitals for a visit.

Auth required: yes

Permission required: `patients.add_vital`

Request:

```json
{
  "height": "70.00",
  "weight": "181.50",
  "blood_pressure": "128/82",
  "heart_rate": 72,
  "temperature": "98.60",
  "collected_at": "2026-04-10T15:00:00Z"
}
```

Notes:

- `collected_at` is optional. If omitted, the backend defaults it to the current time.
- The current model allows multiple vitals records per visit.

Response: vital object.

### GET `/api/vitals/{id}/`

Retrieves one vital record.

Auth required: yes

Permission required: `patients.view_vital`

Response: vital object.

### PUT/PATCH `/api/vitals/{id}/`

Updates one vital record.

Auth required: yes

Permission required: `patients.change_vital`

Patch request:

```json
{
  "blood_pressure": "124/80"
}
```

Response: updated vital object.

## Current API Limitations

- The current API does not expose delete endpoints for patient-domain records.
- Patient detail is read-only; patient update is not currently exposed.
- There is no audit-log API yet.
- MFA is not implemented yet.
- The development settings currently allow all CORS origins.
