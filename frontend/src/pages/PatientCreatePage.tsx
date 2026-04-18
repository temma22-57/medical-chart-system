import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPatient } from "../features/patients/patientService";
import type { CurrentUser } from "../features/auth/authService";
import type { Patient } from "../features/patients/patientService";

interface PatientCreatePageProps {
  currentUser: CurrentUser;
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response
  ) {
    const data = error.response.data;

    if (typeof data === "string") {
      return data;
    }

    if (Array.isArray(data)) {
      return data.join(" ");
    }

    if (typeof data === "object" && data !== null) {
      return Object.values(data).flat().join(" ");
    }
  }

  return "Unable to create patient.";
}

export default function PatientCreatePage({ currentUser }: PatientCreatePageProps) {
  const navigate = useNavigate();
  const [form, setForm] = useState<Patient>({
    first_name: "",
    last_name: "",
    date_of_birth: "",
    phone: "",
    primary_language: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canCreatePatients = currentUser.roles.includes("Doctor");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError("First name and last name are required.");
      return;
    }

    setSubmitting(true);

    try {
      const payload: Patient = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone?.trim() || "",
        primary_language: form.primary_language?.trim() || "",
      };

      if (form.date_of_birth) {
        payload.date_of_birth = form.date_of_birth;
      }

      const patient = await createPatient(payload);
      navigate(`/patients/${patient.id}`);
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setSubmitting(false);
    }
  };

  if (!canCreatePatients) {
    return (
      <section style={{ textAlign: "left" }}>
        <Link to="/patients">Back to patients</Link>
        <h2>Add Patient</h2>
        <p>Doctor access is required to create patient records.</p>
      </section>
    );
  }

  return (
    <section style={{ textAlign: "left" }}>
      <Link to="/patients">Back to patients</Link>
      <h2>Add Patient</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>
            First name
            <input
              value={form.first_name}
              onChange={(event) =>
                setForm({ ...form, first_name: event.target.value })
              }
              required
            />
          </label>
        </div>
        <div>
          <label>
            Last name
            <input
              value={form.last_name}
              onChange={(event) =>
                setForm({ ...form, last_name: event.target.value })
              }
              required
            />
          </label>
        </div>
        <div>
          <label>
            Date of birth
            <input
              type="date"
              value={form.date_of_birth || ""}
              onChange={(event) =>
                setForm({ ...form, date_of_birth: event.target.value })
              }
            />
          </label>
        </div>
        <div>
          <label>
            Phone number
            <input
              value={form.phone || ""}
              onChange={(event) =>
                setForm({ ...form, phone: event.target.value })
              }
            />
          </label>
        </div>
        <div>
          <label>
            Primary language
            <input
              value={form.primary_language || ""}
              onChange={(event) =>
                setForm({ ...form, primary_language: event.target.value })
              }
            />
          </label>
        </div>
        <button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create Patient"}
        </button>
      </form>
      {error && <p>{error}</p>}
    </section>
  );
}
