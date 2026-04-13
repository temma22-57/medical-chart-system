import { useEffect, useRef, useState } from "react";
import { searchPatients } from "../features/patients/patientService";
import type { Patient } from "../features/patients/patientService";

interface PatientSearchProps {
  onSelectPatient: (patientId: number) => void;
}

export default function PatientSearch({ onSelectPatient }: PatientSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const searchText = query.trim();

    if (!searchText) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      const currentRequest = requestId.current + 1;
      requestId.current = currentRequest;
      setLoading(true);
      setSearched(true);

      try {
        const patients = await searchPatients(searchText);

        if (requestId.current === currentRequest) {
          setResults(patients);
        }
      } catch {
        if (requestId.current === currentRequest) {
          setResults([]);
        }
      } finally {
        if (requestId.current === currentRequest) {
          setLoading(false);
        }
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [query]);

  const handleSelect = (patient: Patient) => {
    if (!patient.id) {
      return;
    }

    onSelectPatient(patient.id);
    setQuery("");
    setResults([]);
    setSearched(false);
  };

  return (
    <div style={{ position: "relative", width: "min(360px, 100%)" }}>
      <input
        aria-label="Search patients"
        placeholder="Search patients"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        style={{ boxSizing: "border-box", width: "100%" }}
      />

      {query.trim() && (
        <div
          style={{
            background: "var(--bg)",
            border: "1px solid var(--border)",
            boxSizing: "border-box",
            left: 0,
            marginTop: 4,
            maxHeight: 240,
            overflowY: "auto",
            position: "absolute",
            right: 0,
            textAlign: "left",
            zIndex: 10,
          }}
        >
          {loading && <p style={{ padding: 8 }}>Searching...</p>}
          {!loading && searched && results.length === 0 && (
            <p style={{ padding: 8 }}>No patients found.</p>
          )}
          {!loading && results.map((patient) => (
            <button
              key={patient.id}
              type="button"
              onClick={() => handleSelect(patient)}
              style={{
                background: "transparent",
                border: 0,
                color: "var(--text-h)",
                cursor: "pointer",
                display: "block",
                padding: 8,
                textAlign: "left",
                width: "100%",
              }}
            >
              {patient.first_name} {patient.last_name}
              {patient.date_of_birth ? ` (${patient.date_of_birth})` : ""}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
