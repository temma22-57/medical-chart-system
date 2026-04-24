from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = "Verify whether the current Django PostgreSQL connection is using TLS."

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            cursor.execute("SHOW ssl;")
            server_ssl = cursor.fetchone()[0]
            cursor.execute(
                "SELECT ssl, version, cipher FROM pg_stat_ssl WHERE pid = pg_backend_pid();"
            )
            row = cursor.fetchone()

        if not row:
            self.stdout.write("server_ssl=" + str(server_ssl))
            self.stdout.write(self.style.WARNING("No pg_stat_ssl row was returned for this session."))
            return

        ssl_enabled, version, cipher = row
        self.stdout.write(f"server_ssl={server_ssl}")
        self.stdout.write(f"connection_ssl={ssl_enabled}")
        self.stdout.write(f"tls_version={version}")
        self.stdout.write(f"cipher={cipher}")
