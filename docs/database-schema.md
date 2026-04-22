# Database Schema

The active database is PostgreSQL. Django models live in the `patients` app and Django's built-in auth apps.

This document describes the current schema implemented in `backend/patients/models.py` plus the relevant auth relationships used by the project.

## ER-Style Overview

```text
auth.User
  many-to-many auth.Group
  many-to-many auth.Permission through groups
  one-to-one AccountProfile

Patient
  one-to-many Visit
  one-to-many Medication
  one-to-many Diagnosis
  one-to-many Allergy

Visit
  many-to-one Patient
  one-to-many VisitNote
  one-to-many Vital

VisitNote
  many-to-one Visit
  many-to-one auth.User

Vital
  many-to-one Visit
  indirectly belongs to Patient through Visit

Medication
  many-to-one Patient

Diagnosis
  many-to-one Patient
  one-to-many DiagnosisNote

DiagnosisNote
  many-to-one Diagnosis
  many-to-one auth.User

Allergy
  many-to-one Patient
```

## Auth Tables

Django provides the user, group, and permission tables. The `accounts` app also stores account-specific profile and MFA tables.

Important project usage:

- `Admin` group has no patient-domain permissions and is used by custom API permissions for user-management endpoints.
- `Doctor` group has view/add/change permissions for patients, visits, visit notes, medications, diagnoses, diagnosis notes, allergies, and vitals, plus delete permissions for visits, medications, diagnoses, and allergies subject to the creator-and-8-hour API rule.
- `Nurse` group has view permissions for patients, visits, medications, diagnoses, allergies, and vitals plus view/add/change permissions for their own visit and diagnosis notes.
- DRF token authentication stores API tokens in the `authtoken_token` table.

## AccountProfile

Django model: `accounts.models.AccountProfile`

Purpose: stores per-user application preferences and profile fields that are not part of Django's built-in user table.

Fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | Auto primary key | Django default primary key |
| `user` | `OneToOneField(settings.AUTH_USER_MODEL, related_name="account_profile", on_delete=CASCADE)` | Required |
| `phone` | `CharField(max_length=32, blank=True)` | Optional user contact field |
| `patient_card_order` | `JSONField(default=list, blank=True)` | User-specific patient detail table order |
| `created_at` | `DateTimeField(auto_now_add=True)` | Created timestamp |
| `updated_at` | `DateTimeField(auto_now=True)` | Updated timestamp |

Patient card order values:

```text
medications
diagnoses
allergies
visits
```

If the stored preference is missing or invalid, the backend returns the default order:

```text
medications, diagnoses, allergies, visits
```

## Patient

Django model: `patients.models.Patient`

Purpose: central patient demographic record.

Fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | Auto primary key | Django default primary key |
| `first_name` | `CharField(max_length=100)` | Required |
| `last_name` | `CharField(max_length=100)` | Required |
| `date_of_birth` | `DateField(null=True, blank=True)` | Optional |
| `phone` | `CharField(max_length=20, blank=True)` | Optional |
| `primary_language` | `CharField(max_length=100, blank=True)` | Optional |
| `notes` | `TextField(blank=True)` | Optional |
| `created_at` | `DateTimeField(auto_now_add=True)` | Created timestamp |
| `updated_at` | `DateTimeField(auto_now=True)` | Updated timestamp |

Relationships:

- `Patient.visits` returns related visits.
- `Patient.medications` returns related medications.
- `Patient.diagnoses` returns related diagnoses.
- `Patient.allergies` returns related allergies.

Duplicate rule:

- The serializer rejects an exact duplicate on `first_name`, `last_name`, `date_of_birth`, and `phone`.
- Same-name patients are allowed if date of birth or phone differs.

## Visit

Django model: `patients.models.Visit`

Purpose: records an encounter or chart visit for a patient.

Fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | Auto primary key | Django default primary key |
| `patient` | `ForeignKey(Patient, related_name="visits", on_delete=CASCADE)` | Required |
| `created_by` | `ForeignKey(settings.AUTH_USER_MODEL, related_name="created_visits", null=True, blank=True, on_delete=SET_NULL)` | Creator used for delete eligibility |
| `visit_date` | `DateField()` | Required |
| `primary_care_physician` | `CharField(max_length=150)` | Required text attribution |
| `staff_assigned` | `CharField(max_length=150, blank=True)` | Optional text attribution |
| `created_at` | `DateTimeField(auto_now_add=True)` | Created timestamp |
| `updated_at` | `DateTimeField(auto_now=True)` | Updated timestamp |

Ordering:

```text
-visit_date, -created_at
```

Relationships:

- Each visit belongs to exactly one patient.
- A patient can have many visits.
- `Visit.note_entries` returns authored notes for that visit.
- `Visit.vitals` returns vitals recorded for that visit.

## VisitNote

Django model: `patients.models.VisitNote`

Purpose: stores authored visit note content separately from the visit record.

Fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | Auto primary key | Django default primary key |
| `visit` | `ForeignKey(Visit, related_name="note_entries", on_delete=CASCADE)` | Required |
| `author` | `ForeignKey(settings.AUTH_USER_MODEL, related_name="visit_notes", on_delete=CASCADE)` | Required |
| `content` | `TextField()` | Required note text |
| `created_at` | `DateTimeField(auto_now_add=True)` | Created timestamp |
| `updated_at` | `DateTimeField(auto_now=True)` | Updated timestamp |

Constraints:

```text
unique visit + author
```

Practical effect:

- A user can have one editable note per visit.
- Notes from all users are visible to users with visit-note view permission.
- The API allows users to edit only their own visit note.
- Legacy `Visit.notes` text is migrated into `VisitNote` rows authored by an inactive `legacy_visit_note` user.

## Vital

Django model: `patients.models.Vital`

Purpose: records vitals collected during a specific visit.

Fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | Auto primary key | Django default primary key |
| `visit` | `ForeignKey(Visit, related_name="vitals", on_delete=CASCADE)` | Required |
| `height` | `DecimalField(max_digits=5, decimal_places=2)` | Required |
| `weight` | `DecimalField(max_digits=6, decimal_places=2)` | Required |
| `blood_pressure` | `CharField(max_length=20)` | Required, string format such as `120/80` |
| `heart_rate` | `PositiveIntegerField()` | Required |
| `temperature` | `DecimalField(max_digits=5, decimal_places=2)` | Required |
| `collected_at` | `DateTimeField(default=timezone.now)` | Defaults to current time |
| `created_at` | `DateTimeField(auto_now_add=True)` | Created timestamp |
| `updated_at` | `DateTimeField(auto_now=True)` | Updated timestamp |

Ordering:

```text
-visit__visit_date, -collected_at, -id
```

Relationships:

- Each vital belongs to exactly one visit.
- A visit can have multiple vitals records.
- A vital belongs to a patient indirectly through `vital.visit.patient`.

Latest vitals logic:

- Patient detail responses include `latest_vitals`.
- The backend selects latest vitals by newest visit date, then newest collected time, then newest id.

## Medication

Django model: `patients.models.Medication`

Purpose: records a patient's current or relevant medication.

Fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | Auto primary key | Django default primary key |
| `patient` | `ForeignKey(Patient, related_name="medications", on_delete=CASCADE)` | Required |
| `created_by` | `ForeignKey(settings.AUTH_USER_MODEL, related_name="created_medications", null=True, blank=True, on_delete=SET_NULL)` | Creator used for delete eligibility |
| `name` | `CharField(max_length=150)` | Required |
| `dosage` | `CharField(max_length=100)` | Required |
| `frequency` | `CharField(max_length=100)` | Required |
| `duration` | `CharField(max_length=100, blank=True)` | Optional |
| `is_active` | `BooleanField(default=True)` | True when the patient is actively taking the medication |
| `created_at` | `DateTimeField(auto_now_add=True)` | Created timestamp |
| `updated_at` | `DateTimeField(auto_now=True)` | Updated timestamp |

Ordering:

```text
-is_active, name
```

Relationships:

- Each medication belongs to exactly one patient.
- A patient can have many medications.

## Diagnosis

Django model: `patients.models.Diagnosis`

Purpose: records a patient diagnosis or medical condition.

Fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | Auto primary key | Django default primary key |
| `patient` | `ForeignKey(Patient, related_name="diagnoses", on_delete=CASCADE)` | Required |
| `created_by` | `ForeignKey(settings.AUTH_USER_MODEL, related_name="created_diagnoses", null=True, blank=True, on_delete=SET_NULL)` | Creator used for delete eligibility |
| `name` | `CharField(max_length=150)` | Required |
| `status` | `CharField(max_length=20)` | Required; choices are `current`, `chronic`, `remission`, `resolved` |
| `date_diagnosed` | `DateField()` | Required |
| `diagnosis_code` | `CharField(max_length=30, blank=True)` | Optional ICD-style code placeholder |
| `provider_name` | `CharField(max_length=150, blank=True)` | Optional text attribution |
| `resolution_date` | `DateField(null=True, blank=True)` | Optional |
| `created_at` | `DateTimeField(auto_now_add=True)` | Created timestamp |
| `updated_at` | `DateTimeField(auto_now=True)` | Updated timestamp |

API ordering:

```text
current status first, then -date_diagnosed, then name
```

Relationships:

- Each diagnosis belongs to exactly one patient.
- A patient can have many diagnoses.
- `Diagnosis.note_entries` returns authored notes for that diagnosis.

## DiagnosisNote

Django model: `patients.models.DiagnosisNote`

Purpose: stores authored diagnosis note content separately from the diagnosis record.

Fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | Auto primary key | Django default primary key |
| `diagnosis` | `ForeignKey(Diagnosis, related_name="note_entries", on_delete=CASCADE)` | Required |
| `author` | `ForeignKey(settings.AUTH_USER_MODEL, related_name="diagnosis_notes", on_delete=CASCADE)` | Required |
| `content` | `TextField()` | Required note text |
| `created_at` | `DateTimeField(auto_now_add=True)` | Created timestamp |
| `updated_at` | `DateTimeField(auto_now=True)` | Updated timestamp |

Constraints:

```text
unique diagnosis + author
```

Practical effect:

- A user can have one editable note per diagnosis.
- Notes from all users are visible to users with diagnosis-note view permission.
- The API allows users to edit only their own diagnosis note.
- Legacy `Diagnosis.notes` text is migrated into `DiagnosisNote` rows authored by an inactive `legacy_diagnosis_note` user.

## Allergy

Django model: `patients.models.Allergy`

Purpose: records a patient allergy or sensitivity.

Fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | Auto primary key | Django default primary key |
| `patient` | `ForeignKey(Patient, related_name="allergies", on_delete=CASCADE)` | Required |
| `created_by` | `ForeignKey(settings.AUTH_USER_MODEL, related_name="created_allergies", null=True, blank=True, on_delete=SET_NULL)` | Creator used for delete eligibility |
| `substance` | `CharField(max_length=150)` | Required |
| `reaction` | `CharField(max_length=255, blank=True)` | Optional |
| `created_at` | `DateTimeField(auto_now_add=True)` | Created timestamp |
| `updated_at` | `DateTimeField(auto_now=True)` | Updated timestamp |

Ordering:

```text
substance
```

Relationships:

- Each allergy belongs to exactly one patient.
- A patient can have many allergies.

## Cascade Behavior

Patient-domain foreign keys use `on_delete=models.CASCADE`.

Practical effect:

- Deleting a patient deletes their visits, medications, diagnoses, and allergies.
- Deleting a visit deletes its visit notes and vitals.
- Deleting a diagnosis deletes its diagnosis notes.

The API exposes delete endpoints for visits, medications, diagnoses, and allergies only when the authenticated user created the record and the record is less than 8 hours old. Records without `created_by`, including legacy rows, are not eligible for user deletion through those endpoints.

## Edit Policy

Main patient-related table entries are immutable after creation except for status fields:

- Medication `is_active` can be changed.
- Diagnosis `status` can be changed.
- Visits and allergies do not currently have status fields, so their existing data cannot be changed through the normal API after creation.

## Current Schema Limitations

- Doctor and staff attribution on visits are text fields, not foreign keys to user/staff profiles.
- Diagnosis provider attribution is stored as text, not linked to user accounts.
- Vitals are visit-level records but are not constrained to one record per visit.
- There is no audit log table yet.
- There are no separate treatment/procedure tables yet.
- The current model uses Django's default user model rather than a custom user profile model.
