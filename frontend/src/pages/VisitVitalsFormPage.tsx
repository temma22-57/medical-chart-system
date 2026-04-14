import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createVital, getPatient } from "../features/patients/patientService";
import type { PatientDetail, VitalPayload, Visit } from "../features/patients/patientService";

type VitalFormValues = Record<keyof VitalPayload, string>;

const initialValues: VitalFormValues = {
  height: "",
  weight: "",
  blood_pressure: "",
  heart_rate: "",
  temperature: "",
};

const fieldLabels: Record<keyof VitalPayload, string> = {
  height: "Height",
  weight: "Weight",
  blood_pressure: "Blood pressure",
  heart_rate: "Heart rate",
  temperature: "Temperature",
};

export default function VisitVitalsFormPage() {
  const { id, recordId } = useParams();
  const navigate = useNavigate();
  const patientId = Number(id);
  const visitId = Number(recordId);
  const [values, setValues] = useState<VitalFormValues>(initialValues);
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadVisit = async () => {
      if (!Number.isFinite(patientId) || !Number.isFinite(visitId)) {
        setError("Invalid vitals route.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const loadedPatient = await getPatient(patientId);
        const loadedVisit = loadedPatient.visits.find((record) => record.id === visitId);

        if (!loadedVisit) {
          setError("Unable to find this visit for the selected patient.");
          return;
        }

        setPatient(loadedPatient);
        setVisit(loadedVisit);
      } catch {
        setError("Unable to load visit details.");
      } finally {
        setLoading(false);
      }
    };

    loadVisit();
  }, [patientId, visitId]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await createVital(visitId, {
        height: values.height,
        weight: values.weight,
        blood_pressure: values.blood_pressure,
        heart_rate: Number(values.heart_rate),
        temperature: values.temperature,
      });
      navigate(`/patients/${patientId}`);
    } catch {
      setError("Unable to save vitals for this visit.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p>Loading visit details...</p>;
  }

  if (!visit) {
    return (
      <section style={{ textAlign: "left" }}>
        <Link to={`/patients/${patientId}`}>Back to patient chart</Link>
        <h2>Add Vitals</h2>
        {error && <p>{error}</p>}
      </section>
    );
  }

  return (
    <section style={{ textAlign: "left" }}>
      <Link to={`/patients/${patientId}`}>Back to patient chart</Link>
      <h2>Add Vitals</h2>
      {patient && visit && (
        <p>
          Patient: {patient.first_name} {patient.last_name} | Visit: {visit.visit_date}
        </p>
      )}
      {visit.vitals.length > 0 && (
        <p>This visit already has vitals recorded. Additional vitals can still be saved if needed.</p>
      )}
      <form onSubmit={handleSubmit}>
        {(Object.entries(fieldLabels) as [keyof VitalPayload, string][]).map(([field, label]) => (
          <div key={field} style={{ marginBottom: 12 }}>
            <label>
              {label}
              <input
                type={field === "blood_pressure" ? "text" : "number"}
                step={field === "heart_rate" ? "1" : "0.01"}
                min={field === "heart_rate" ? "0" : undefined}
                value={values[field]}
                onChange={(event) =>
                  setValues({ ...values, [field]: event.target.value })
                }
                required
                style={{ display: "block", width: "100%" }}
              />
            </label>
          </div>
        ))}
        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Add Vitals"}
        </button>
      </form>
      {error && <p>{error}</p>}
    </section>
  );
}
