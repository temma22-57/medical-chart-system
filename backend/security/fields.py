from django.db import models

from .crypto import decrypt_string, encrypt_string


class EncryptedFieldMixin:
    def db_type(self, connection):
        return "text"

    def from_db_value(self, value, expression, connection):
        if value in (None, ""):
            return value
        return self.deserialize_value(decrypt_string(value))

    def to_python(self, value):
        if value in (None, ""):
            return value
        if not isinstance(value, str):
            return value
        return self.deserialize_value(decrypt_string(value))

    def get_prep_value(self, value):
        if value in (None, ""):
            return value
        return encrypt_string(self.serialize_value(value))

    def serialize_value(self, value):
        return str(value)

    def deserialize_value(self, value):
        return value


class EncryptedCharField(EncryptedFieldMixin, models.CharField):
    pass


class EncryptedTextField(EncryptedFieldMixin, models.TextField):
    pass


class EncryptedDateField(EncryptedFieldMixin, models.DateField):
    def serialize_value(self, value):
        date_value = models.DateField.to_python(self, value)
        if date_value is None:
            return None
        return date_value.isoformat()

    def deserialize_value(self, value):
        return models.DateField.to_python(self, value)
