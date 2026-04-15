# Database Schema

The active database is PostgreSQL. Django models live in the `patients` app and Django's built-in auth apps.

This document describes the current schema implemented in `backend/patients/models.py` plus the relevant auth relationships used by the project.

## ER-Style Overview

```text
auth.User
  many-to-many auth.Group
  many-to-many auth.Permission through groups

Patient
  one-to-many Visit
  one-to-many Medication
  one-to-many Allergy

Visit
  many-to-one Patient
  one-to-many Vital

Vital
  many-to-one Visit
  indirectly belongs to Patient through Visit

Medication
  many-to-one Patient

Allergy
  many-to-one Patient
```

## Auth Tables

Django provides the user, group, and permission tables.

Important project usage:

- `Doctor` group has view/add/change permissions for patients, visits, medications, allergies, and vitals.
- `Nurse` group has view permissions for patients, visits, medications, allergies, and vitals.
- DRF token authentication stores API tokens in the `authtoken_token` table.

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
| `notes` | `TextField(blank=True)` | Optional |
| `created_at` | `DateTimeField(auto_now_add=True)` | Created timestamp |
| `updated_at` | `DateTimeField(auto_now=True)` | Updated timestamp |

Relationships:

- `Patient.visits` returns related visits.
- `Patient.medications` returns related medications.
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
| `visit_date` | `DateField()` | Required |
| `primary_care_physician` | `CharField(max_length=150)` | Required text attribution |
| `staff_assigned` | `CharField(max_length=150, blank=True)` | Optional text attribution |
| `notes` | `TextField()` | Required |
| `created_at` | `DateTimeField(auto_now_add=True)` | Created timestamp |
| `updated_at` | `DateTimeField(auto_now=True)` | Updated timestamp |

Ordering:

```text
-visit_date, -created_at
```

Relationships:

- Each visit belongs to exactly one patient.
- A patient can have many visits.
- `Visit.vitals` returns vitals recorded for that visit.

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
| `name` | `CharField(max_length=150)` | Required |
| `dosage` | `CharField(max_length=100)` | Required |
| `frequency` | `CharField(max_length=100)` | Required |
| `created_at` | `DateTimeField(auto_now_add=True)` | Created timestamp |
| `updated_at` | `DateTimeField(auto_now=True)` | Updated timestamp |

Ordering:

```text
name
```

Relationships:

- Each medication belongs to exactly one patient.
- A patient can have many medications.

## Allergy

Django model: `patients.models.Allergy`

Purpose: records a patient allergy or sensitivity.

Fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | Auto primary key | Django default primary key |
| `patient` | `ForeignKey(Patient, related_name="allergies", on_delete=CASCADE)` | Required |
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

- Deleting a patient deletes their visits, medications, and allergies.
- Deleting a visit deletes its vitals.

The current API does not expose delete endpoints, but the database relationship behavior is still part of the model design.

## Current Schema Limitations

- Doctor and staff attribution on visits are text fields, not foreign keys to user/staff profiles.
- Vitals are visit-level records but are not constrained to one record per visit.
- There is no audit log table yet.
- There are no separate treatment/procedure tables yet.
- The current model uses Django's default user model rather than a custom user profile model.
