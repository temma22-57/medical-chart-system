import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPatient } from "../features/patients/patientService";
import type { PatientDetail as PatientDetailType } from "../features/patients/patientService";

type DetailSection = "overview" | "visits" | "medications" | "allergies" | "vitals";

export default function PatientDetail() {
  const { id } = useParams();
  const patientId = Number(id);
  const [patient, setPatient] = useState<PatientDetailType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState<DetailSection>("overview");

  useEffect(() => {
    const loadPatient = async () => {
      if (!Number.isFinite(patientId)) {
        setError("Invalid patient id.");
        setPatient(null);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const data = await getPatient(patientId);
        setPatient(data);
      } catch {
        setError("Unable to load patient details.");
        setPatient(null);
      } finally {
        setLoading(false);
      }
    };

    loadPatient();
  }, [patientId]);

  if (loading) {
    return <p>Loading patient details...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  if (!patient) {
    return <p>Select a patient to view medical record details.</p>;
  }

  return (
    <section style={{ marginTop: 24, textAlign: "left" }}>
      <Link to="/patients">Back to patients</Link>
      <h3>
        {patient.first_name} {patient.last_name}
      </h3>

      <nav style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {(["overview", "visits", "medications", "allergies", "vitals"] as DetailSection[]).map(
          (section) => (
            <button
              key={section}
              type="button"
              onClick={() => setActiveSection(section)}
              style={{
                borderColor: activeSection === section ? "var(--accent)" : "var(--border)",
              }}
            >
              {section[0].toUpperCase() + section.slice(1)}
            </button>
          ),
        )}
      </nav>

      {activeSection === "overview" && (
        <>
          <h4>Overview</h4>
          <p>Date of birth: {patient.date_of_birth || "Not recorded"}</p>
          <p>Phone: {patient.phone || "Not recorded"}</p>
          {patient.notes && <p>Notes: {patient.notes}</p>}
        </>
      )}

      {activeSection === "vitals" && (
        <>
          <h4>Latest Vitals</h4>
          {patient.latest_vitals ? (
            <dl>
              <dt>Height</dt>
              <dd>{patient.latest_vitals.height}</dd>
              <dt>Weight</dt>
              <dd>{patient.latest_vitals.weight}</dd>
              <dt>Blood pressure</dt>
              <dd>{patient.latest_vitals.blood_pressure}</dd>
              <dt>Heart rate</dt>
              <dd>{patient.latest_vitals.heart_rate}</dd>
              <dt>Temperature</dt>
              <dd>{patient.latest_vitals.temperature}</dd>
              <dt>Collected</dt>
              <dd>{new Date(patient.latest_vitals.collected_at).toLocaleString()}</dd>
            </dl>
          ) : (
            <p>No vitals recorded.</p>
          )}
        </>
      )}

      {activeSection === "medications" && (
        <>
          <h4>Medications</h4>
          {patient.medications.length === 0 ? (
            <p>No medications recorded.</p>
          ) : (
            <ul>
              {patient.medications.map((medication) => (
                <li key={medication.id}>
                  {medication.name} - {medication.dosage}, {medication.frequency}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {activeSection === "allergies" && (
        <>
          <h4>Allergies</h4>
          {patient.allergies.length === 0 ? (
            <p>No allergies recorded.</p>
          ) : (
            <ul>
              {patient.allergies.map((allergy) => (
                <li key={allergy.id}>
                  {allergy.substance}
                  {allergy.reaction ? ` - ${allergy.reaction}` : ""}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {activeSection === "visits" && (
        <>
          <h4>Visit History</h4>
          {patient.visits.length === 0 ? (
            <p>No visits recorded.</p>
          ) : (
            <ul>
              {patient.visits.map((visit) => (
                <li key={visit.id}>
                  <strong>{visit.visit_date}</strong> with {visit.primary_care_physician}
                  {visit.staff_assigned ? `, staff: ${visit.staff_assigned}` : ""}
                  <br />
                  {visit.notes}
                  {visit.vitals.length > 0 && (
                    <ul>
                      {visit.vitals.map((vital) => (
                        <li key={vital.id}>
                          Vitals: {vital.blood_pressure}, HR {vital.heart_rate}, temp{" "}
                          {vital.temperature}, height {vital.height}, weight {vital.weight}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
