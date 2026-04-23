from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from accounts.email_utils import send_plain_text_email


class Command(BaseCommand):
    help = "Send a plain-text test email using the current Django email settings."

    def add_arguments(self, parser):
        parser.add_argument("recipient", help="Email address to receive the test message.")

    def handle(self, *args, **options):
        recipient = options["recipient"].strip()
        if not recipient:
            raise CommandError("A recipient email address is required.")

        self.stdout.write(
            "Using "
            f"backend={settings.EMAIL_BACKEND} "
            f"host={settings.EMAIL_HOST} "
            f"sender={settings.DEFAULT_FROM_EMAIL or settings.EMAIL_HOST_USER}"
        )

        try:
            sent_count = send_plain_text_email(
                subject="Medical Chart SMTP test email",
                message=(
                    "This is a test email sent from the medical chart project.\n\n"
                    f"Backend: {settings.EMAIL_BACKEND}\n"
                    f"Sender: {settings.DEFAULT_FROM_EMAIL or settings.EMAIL_HOST_USER}\n"
                    "If you received this message, Django email delivery is working."
                ),
                recipient_list=[recipient],
            )
        except Exception as exc:
            raise CommandError(f"Failed to send test email: {exc}") from exc

        if sent_count != 1:
            raise CommandError(
                f"SMTP did not report success for the test email. send_mail returned {sent_count}."
            )

        self.stdout.write(
            self.style.SUCCESS(f"Test email sent successfully to {recipient}.")
        )
