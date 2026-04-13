from django.contrib import admin

from .models import Allergy, Medication, Patient, Visit


admin.site.register(Patient)
admin.site.register(Visit)
admin.site.register(Medication)
admin.site.register(Allergy)
