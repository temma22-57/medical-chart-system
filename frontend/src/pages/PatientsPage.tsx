import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPatients } from "../features/patients/patientService";
import type { CurrentUser } from "../features/auth/authService";
import type { Patient } from "../features/patients/patientService";

interface PatientsPageProps {
  currentUser: CurrentUser;
}

export default function PatientsPage({ currentUser }: PatientsPageProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canCreatePatients = currentUser.roles.includes("Doctor");

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getPatients();
      setPatients(data);
    } catch {
      setError("Unable to load patients.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={{ textAlign: "left" }}>
      <div style={{ alignItems: "center", display: "flex", gap: 12 }}>
        <h2>Patients</h2>
        {canCreatePatients && <Link to="/patients/new">Add Patient</Link>}
      </div>

      {!canCreatePatients && (
        <p>Nurse access is read-only for patient records in this prototype.</p>
      )}

      {error && <p>{error}</p>}
      {loading ? (
        <p>Loading patients...</p>
      ) : patients.length === 0 ? (
        <p>No patients recorded yet.</p>
      ) : (
        <ul>
          {patients.map((p) => {
            const patientId = p.id;

            return (
              <li key={patientId}>
                {p.first_name} {p.last_name}
                {patientId !== undefined && (
                  <Link style={{ marginLeft: 8 }} to={`/patients/${patientId}`}>
                    View record
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
