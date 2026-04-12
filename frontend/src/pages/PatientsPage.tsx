import { useEffect, useState } from "react";
import { getPatients, createPatient} from "../features/patients/patientService";
import type { Patient } from "../features/patients/patientService";

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [form, setForm] = useState<Patient>({
    first_name: "",
    last_name: "",
  });

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
      <h2>Patients</h2>

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

      <ul>
        {patients.map((p) => (
          <li key={p.id}>
            {p.first_name} {p.last_name}
          </li>
        ))}
      </ul>
    </div>
  );
}
