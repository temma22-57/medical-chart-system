import { useEffect, useState } from "react";
import { getPatient } from "../features/patients/patientService";
import type { PatientDetail as PatientDetailType } from "../features/patients/patientService";

interface PatientDetailProps {
  patientId: number;
}

export default function PatientDetail({ patientId }: PatientDetailProps) {
  const [patient, setPatient] = useState<PatientDetailType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPatient = async () => {
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
      <h3>
        {patient.first_name} {patient.last_name}
      </h3>
      <p>Date of birth: {patient.date_of_birth || "Not recorded"}</p>
      <p>Phone: {patient.phone || "Not recorded"}</p>
      {patient.notes && <p>Notes: {patient.notes}</p>}

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
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
