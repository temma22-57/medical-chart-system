from django.contrib import admin

from .models import Allergy, Diagnosis, Medication, Patient, Visit, VisitNote, Vital


admin.site.register(Patient)
admin.site.register(Visit)
admin.site.register(VisitNote)
admin.site.register(Medication)
admin.site.register(Diagnosis)
admin.site.register(Allergy)
admin.site.register(Vital)
