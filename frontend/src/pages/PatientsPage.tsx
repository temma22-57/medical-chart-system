import { useEffect, useState } from "react";
import { getPatients, createPatient } from "../features/patients/patientService";
import type { CurrentUser } from "../features/auth/authService";
import type { Patient } from "../features/patients/patientService";
import PatientDetail from "./PatientDetail";

interface PatientsPageProps {
  currentUser: CurrentUser;
  onLogout: () => void;
}

export default function PatientsPage({ currentUser, onLogout }: PatientsPageProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [form, setForm] = useState<Patient>({
    first_name: "",
    last_name: "",
  });
  const canCreatePatients = currentUser.roles.includes("Doctor");

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    const data = await getPatients();
    setPatients(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createPatient(form);
    setForm({ first_name: "", last_name: "" });
    await loadPatients();
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <span>
          Signed in as {currentUser.username} ({currentUser.roles.join(", ") || "No role"})
        </span>
        <button type="button" style={{ marginLeft: 8 }} onClick={onLogout}>
          Log out
        </button>
      </div>

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

      <ul>
        {patients.map((p) => (
          <li key={p.id}>
            {p.first_name} {p.last_name}
            {p.id && (
              <button
                type="button"
                style={{ marginLeft: 8 }}
                onClick={() => setSelectedPatientId(p.id ?? null)}
              >
                View record
              </button>
            )}
          </li>
        ))}
      </ul>

      {selectedPatientId ? (
        <PatientDetail patientId={selectedPatientId} />
      ) : (
        <p>Select a patient to view visit history, medications, and allergies.</p>
      )}
    </div>
  );
}
