import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createAllergy,
  createDiagnosis,
  createMedication,
  createVisit,
  getPatient,
  updateAllergy,
  updateDiagnosis,
  updateMedication,
  updateVisit,
} from "../features/patients/patientService";
import type { Allergy, Diagnosis, Medication, PatientDetail, Visit } from "../features/patients/patientService";

type RecordType = "visits" | "medications" | "diagnoses" | "allergies";
type FormValues = Record<string, string>;

interface PatientRelatedRecordFormPageProps {
  recordType: RecordType;
  mode: "add" | "edit";
}

const fieldLabels: Record<RecordType, Record<string, string>> = {
  visits: {
    visit_date: "Visit date",
    primary_care_physician: "Primary care physician",
    staff_assigned: "Staff assigned",
  },
  medications: {
    name: "Name",
    dosage: "Dosage",
    frequency: "Frequency",
  },
  diagnoses: {
    name: "Name",
    status: "Status",
    date_diagnosed: "Date diagnosed",
    diagnosis_code: "Diagnosis code",
    provider_name: "Provider",
    resolution_date: "Resolution date",
    notes: "Notes",
  },
  allergies: {
    substance: "Substance",
    reaction: "Reaction",
  },
};

const initialValues: Record<RecordType, FormValues> = {
  visits: {
    visit_date: "",
    primary_care_physician: "",
    staff_assigned: "",
  },
  medications: {
    name: "",
    dosage: "",
    frequency: "",
  },
  diagnoses: {
    name: "",
    status: "current",
    date_diagnosed: "",
    diagnosis_code: "",
    provider_name: "",
    resolution_date: "",
    notes: "",
  },
  allergies: {
    substance: "",
    reaction: "",
  },
};

function getRecord(patient: PatientDetail, recordType: RecordType, recordId: number) {
  if (recordType === "visits") {
    return patient.visits.find((record) => record.id === recordId);
  }

  if (recordType === "medications") {
    return patient.medications.find((record) => record.id === recordId);
  }

  if (recordType === "diagnoses") {
    return patient.diagnoses.find((record) => record.id === recordId);
  }

  return patient.allergies.find((record) => record.id === recordId);
}

function valuesFromRecord(recordType: RecordType, record: Visit | Medication | Diagnosis | Allergy): FormValues {
  if (recordType === "visits") {
    const visit = record as Visit;
    return {
      visit_date: visit.visit_date,
      primary_care_physician: visit.primary_care_physician,
      staff_assigned: visit.staff_assigned || "",
    };
  }

  if (recordType === "medications") {
    const medication = record as Medication;
    return {
      name: medication.name,
      dosage: medication.dosage,
      frequency: medication.frequency,
    };
  }

  if (recordType === "diagnoses") {
    const diagnosis = record as Diagnosis;
    return {
      name: diagnosis.name,
      status: diagnosis.status,
      date_diagnosed: diagnosis.date_diagnosed,
      diagnosis_code: diagnosis.diagnosis_code || "",
      provider_name: diagnosis.provider_name || "",
      resolution_date: diagnosis.resolution_date || "",
      notes: diagnosis.notes || "",
    };
  }

  const allergy = record as Allergy;
  return {
    substance: allergy.substance,
    reaction: allergy.reaction || "",
  };
}

function titleFor(recordType: RecordType) {
  if (recordType === "visits") {
    return "Visit";
  }

  if (recordType === "medications") {
    return "Medication";
  }

  if (recordType === "diagnoses") {
    return "Diagnosis";
  }

  return "Allergy";
}

export default function PatientRelatedRecordFormPage({
  recordType,
  mode,
}: PatientRelatedRecordFormPageProps) {
  const { id, recordId } = useParams();
  const navigate = useNavigate();
  const patientId = Number(id);
  const relatedRecordId = Number(recordId);
  const [values, setValues] = useState<FormValues>(initialValues[recordType]);
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [currentRecord, setCurrentRecord] = useState<Visit | Medication | Diagnosis | Allergy | null>(null);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode !== "edit") {
      setValues(initialValues[recordType]);
      return;
    }

    const loadRecord = async () => {
      if (!Number.isFinite(patientId) || !Number.isFinite(relatedRecordId)) {
        setError("Invalid record route.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const loadedPatient = await getPatient(patientId);
        const record = getRecord(loadedPatient, recordType, relatedRecordId);

        if (!record) {
          setError("Unable to find this record for the selected patient.");
          return;
        }

        setPatient(loadedPatient);
        setCurrentRecord(record);
        setValues(valuesFromRecord(recordType, record));
      } catch {
        setError("Unable to load record.");
      } finally {
        setLoading(false);
      }
    };

    loadRecord();
  }, [mode, patientId, recordType, relatedRecordId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (mode === "edit" && !window.confirm("Save these changes to the patient record?")) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (recordType === "visits") {
        const payload = {
          visit_date: values.visit_date,
          primary_care_physician: values.primary_care_physician,
          staff_assigned: values.staff_assigned,
        };
        if (mode === "add") {
          await createVisit(patientId, payload);
        } else {
          await updateVisit(relatedRecordId, payload);
        }
      } else if (recordType === "medications") {
        const payload = {
          name: values.name,
          dosage: values.dosage,
          frequency: values.frequency,
        };
        if (mode === "add") {
          await createMedication(patientId, payload);
        } else {
          await updateMedication(relatedRecordId, payload);
        }
      } else if (recordType === "diagnoses") {
        const payload = {
          name: values.name,
          status: values.status,
          date_diagnosed: values.date_diagnosed,
          diagnosis_code: values.diagnosis_code,
          provider_name: values.provider_name,
          resolution_date: values.resolution_date || undefined,
          notes: values.notes,
        };
        if (mode === "add") {
          await createDiagnosis(patientId, payload);
        } else {
          await updateDiagnosis(relatedRecordId, payload);
        }
      } else {
        const payload = {
          substance: values.substance,
          reaction: values.reaction,
        };
        if (mode === "add") {
          await createAllergy(patientId, payload);
        } else {
          await updateAllergy(relatedRecordId, payload);
        }
      }

      navigate(`/patients/${patientId}`);
    } catch {
      setError("Unable to save this record.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p>Loading record...</p>;
  }

  const recordTitle = titleFor(recordType);
  const fields = Object.entries(fieldLabels[recordType]);
  const optionalFields = [
    "staff_assigned",
    "reaction",
    "diagnosis_code",
    "provider_name",
    "resolution_date",
    "notes",
  ];
  const visitWithoutVitals =
    recordType === "visits" &&
    mode === "edit" &&
    currentRecord &&
    (currentRecord as Visit).vitals.length === 0;

  return (
    <section style={{ textAlign: "left" }}>
      <Link to={`/patients/${patientId}`}>Back to patient chart</Link>
      <h2>
        {mode === "add" ? "Add" : "Edit"} {recordTitle}
      </h2>
      {patient && (
        <p>
          Patient: {patient.first_name} {patient.last_name}
        </p>
      )}
      <form onSubmit={handleSubmit}>
        {fields.map(([field, label]) => (
          <div key={field} style={{ marginBottom: 12 }}>
            <label>
              {label}
              {field === "notes" ? (
                <textarea
                  value={values[field] || ""}
                  onChange={(event) =>
                    setValues({ ...values, [field]: event.target.value })
                  }
                  required={!optionalFields.includes(field)}
                  style={{ display: "block", width: "100%" }}
                />
              ) : field === "status" ? (
                <select
                  value={values[field] || "current"}
                  onChange={(event) =>
                    setValues({ ...values, [field]: event.target.value })
                  }
                  required
                  style={{ display: "block", width: "100%" }}
                >
                  <option value="current">Current</option>
                  <option value="chronic">Chronic</option>
                  <option value="remission">Remission</option>
                  <option value="resolved">Resolved</option>
                </select>
              ) : (
                <input
                  type={["visit_date", "date_diagnosed", "resolution_date"].includes(field) ? "date" : "text"}
                  value={values[field] || ""}
                  onChange={(event) =>
                    setValues({ ...values, [field]: event.target.value })
                  }
                  required={!optionalFields.includes(field)}
                  style={{ display: "block", width: "100%" }}
                />
              )}
            </label>
          </div>
        ))}
        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : mode === "add" ? `Add ${recordTitle}` : "Review and Save"}
        </button>
      </form>
      {mode === "edit" && (
        <p>Saving edits requires a confirmation step after you submit this form.</p>
      )}
      {visitWithoutVitals && (
        <p style={{ marginTop: 12 }}>
          No vitals have been recorded for this visit.{" "}
          <Link to={`/patients/${patientId}/visits/${relatedRecordId}/vitals/new`}>
            Add Vitals
          </Link>
        </p>
      )}
      {error && <p>{error}</p>}
    </section>
  );
}
