from django.db import migrations
from security.fields import EncryptedCharField, EncryptedDateField, EncryptedTextField


def encrypt_existing_patient_data(apps, schema_editor):
    field_map = {
        "Patient": ["date_of_birth", "phone", "primary_language", "notes"],
        "Visit": ["primary_care_physician", "staff_assigned"],
        "VisitNote": ["content"],
        "Vital": ["blood_pressure"],
        "Medication": ["dosage", "frequency", "duration"],
        "Diagnosis": ["diagnosis_code", "provider_name", "resolution_date"],
        "DiagnosisNote": ["content"],
        "Allergy": ["reaction"],
    }

    for model_name, fields in field_map.items():
        model = apps.get_model("patients", model_name)
        for instance in model.objects.all().iterator():
            for field in fields:
                setattr(instance, field, getattr(instance, field))
            instance.save(update_fields=fields)


class Migration(migrations.Migration):
    dependencies = [
        ("patients", "0009_alter_medication_options_medication_is_active"),
    ]

    operations = [
        migrations.AlterField(
            model_name="patient",
            name="date_of_birth",
            field=EncryptedDateField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="patient",
            name="phone",
            field=EncryptedCharField(blank=True, max_length=20),
        ),
        migrations.AlterField(
            model_name="patient",
            name="primary_language",
            field=EncryptedCharField(blank=True, max_length=100),
        ),
        migrations.AlterField(
            model_name="patient",
            name="notes",
            field=EncryptedTextField(blank=True),
        ),
        migrations.AlterField(
            model_name="visit",
            name="primary_care_physician",
            field=EncryptedCharField(max_length=150),
        ),
        migrations.AlterField(
            model_name="visit",
            name="staff_assigned",
            field=EncryptedCharField(blank=True, max_length=150),
        ),
        migrations.AlterField(
            model_name="visitnote",
            name="content",
            field=EncryptedTextField(),
        ),
        migrations.AlterField(
            model_name="vital",
            name="blood_pressure",
            field=EncryptedCharField(max_length=20),
        ),
        migrations.AlterField(
            model_name="medication",
            name="dosage",
            field=EncryptedCharField(max_length=100),
        ),
        migrations.AlterField(
            model_name="medication",
            name="frequency",
            field=EncryptedCharField(max_length=100),
        ),
        migrations.AlterField(
            model_name="medication",
            name="duration",
            field=EncryptedCharField(blank=True, max_length=100),
        ),
        migrations.AlterField(
            model_name="diagnosis",
            name="diagnosis_code",
            field=EncryptedCharField(blank=True, max_length=30),
        ),
        migrations.AlterField(
            model_name="diagnosis",
            name="provider_name",
            field=EncryptedCharField(blank=True, max_length=150),
        ),
        migrations.AlterField(
            model_name="diagnosis",
            name="resolution_date",
            field=EncryptedDateField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="diagnosisnote",
            name="content",
            field=EncryptedTextField(),
        ),
        migrations.AlterField(
            model_name="allergy",
            name="reaction",
            field=EncryptedCharField(blank=True, max_length=255),
        ),
        migrations.RunPython(encrypt_existing_patient_data, migrations.RunPython.noop),
    ]
