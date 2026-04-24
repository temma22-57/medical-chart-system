from django.apps import apps
from django.core.management.base import BaseCommand, CommandError
from django.db import connection

from security.crypto import ENCRYPTED_PREFIX


class Command(BaseCommand):
    help = "Inspect a raw database value and report whether it is stored encrypted at rest."

    def add_arguments(self, parser):
        parser.add_argument("model", help="Model label in the form app_label.ModelName")
        parser.add_argument("pk", type=int, help="Primary key of the row to inspect")
        parser.add_argument("field", help="Model field name to inspect")

    def handle(self, *args, **options):
        model_label = options["model"]
        try:
            app_label, model_name = model_label.split(".", 1)
        except ValueError as exc:
            raise CommandError("Model must be in the form app_label.ModelName") from exc

        model = apps.get_model(app_label, model_name)
        if model is None:
            raise CommandError(f"Unknown model {model_label}")

        field = model._meta.get_field(options["field"])
        table = model._meta.db_table

        with connection.cursor() as cursor:
            cursor.execute(
                f'SELECT "{field.column}" FROM "{table}" WHERE id = %s',
                [options["pk"]],
            )
            row = cursor.fetchone()

        if row is None:
            raise CommandError(f"No {model_label} row found with id={options['pk']}")

        raw_value = row[0]
        stored_encrypted = isinstance(raw_value, str) and raw_value.startswith(ENCRYPTED_PREFIX)
        preview = ""
        if isinstance(raw_value, str):
            preview = raw_value[:24] + ("..." if len(raw_value) > 24 else "")

        self.stdout.write(f"table={table}")
        self.stdout.write(f"column={field.column}")
        self.stdout.write(f"stored_encrypted={stored_encrypted}")
        self.stdout.write(f"raw_preview={preview}")
