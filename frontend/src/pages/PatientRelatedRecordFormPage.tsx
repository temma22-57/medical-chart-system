import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createAllergy,
  createMedication,
  createVisit,
  getPatient,
  updateAllergy,
  updateMedication,
  updateVisit,
} from "../features/patients/patientService";
import type { Allergy, Medication, PatientDetail, Visit } from "../features/patients/patientService";

type RecordType = "visits" | "medications" | "allergies";
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
    notes: "Notes",
  },
  medications: {
    name: "Name",
    dosage: "Dosage",
    frequency: "Frequency",
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
    notes: "",
  },
  medications: {
    name: "",
    dosage: "",
    frequency: "",
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

  return patient.allergies.find((record) => record.id === recordId);
}

function valuesFromRecord(recordType: RecordType, record: Visit | Medication | Allergy): FormValues {
  if (recordType === "visits") {
    const visit = record as Visit;
    return {
      visit_date: visit.visit_date,
      primary_care_physician: visit.primary_care_physician,
      staff_assigned: visit.staff_assigned || "",
      notes: visit.notes,
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
  const [currentRecord, setCurrentRecord] = useState<Visit | Medication | Allergy | null>(null);
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
          notes: values.notes,
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
                  required
                  style={{ display: "block", width: "100%" }}
                />
              ) : (
                <input
                  type={field === "visit_date" ? "date" : "text"}
                  value={values[field] || ""}
                  onChange={(event) =>
                    setValues({ ...values, [field]: event.target.value })
                  }
                  required={!["staff_assigned", "reaction"].includes(field)}
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
