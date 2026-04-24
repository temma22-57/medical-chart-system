from django.db import migrations
from security.fields import EncryptedCharField


def encrypt_existing_account_data(apps, schema_editor):
    AccountProfile = apps.get_model("accounts", "AccountProfile")

    for profile in AccountProfile.objects.all().iterator():
        profile.phone = profile.phone
        profile.save(update_fields=["phone"])


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_accountprofile_patient_card_order"),
    ]

    operations = [
        migrations.AlterField(
            model_name="accountprofile",
            name="phone",
            field=EncryptedCharField(blank=True, max_length=32),
        ),
        migrations.RunPython(encrypt_existing_account_data, migrations.RunPython.noop),
    ]
