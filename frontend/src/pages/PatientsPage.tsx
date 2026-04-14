import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPatients, createPatient } from "../features/patients/patientService";
import type { CurrentUser } from "../features/auth/authService";
import type { Patient } from "../features/patients/patientService";

interface PatientsPageProps {
  currentUser: CurrentUser;
}

export default function PatientsPage({ currentUser }: PatientsPageProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Patient>({
    first_name: "",
    last_name: "",
  });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await createPatient(form);
      setForm({ first_name: "", last_name: "" });
      await loadPatients();
    } catch {
      setError("Unable to create patient.");
    }
  };

  return (
    <section style={{ textAlign: "left" }}>
      <h2>Patients</h2>

      {canCreatePatients ? (
        <form onSubmit={handleSubmit}>
          <input
            placeholder="First Name"
            value={form.first_name}
            onChange={(e) =>
              setForm({ ...form, first_name: e.target.value })
            }
          />
          <input
            placeholder="Last Name"
            value={form.last_name}
            onChange={(e) =>
              setForm({ ...form, last_name: e.target.value })
            }
          />
          <button type="submit">Add Patient</button>
        </form>
      ) : (
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
