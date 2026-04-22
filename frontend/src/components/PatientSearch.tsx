import { useEffect, useRef, useState } from "react";
import { Box, Button, InputAdornment, Paper, TextField, Typography } from "@mui/material";
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
    <Box sx={{ position: "relative", width: "min(380px, 100%)" }}>
      <TextField
        fullWidth
        aria-label="Search patients"
        placeholder="Search patients"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        size="small"
        sx={{
          "& .MuiOutlinedInput-root": {
            backgroundColor: "#f8fcfa",
            borderRadius: 999,
            boxShadow: "0 8px 20px rgba(21, 63, 55, 0.08)",
            pr: 0.5,
          },
        }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Typography sx={{ color: "#5a7a71", fontSize: 16 }}>Search</Typography>
              </InputAdornment>
            ),
          },
        }}
      />

      {query.trim() && (
        <Paper
          variant="outlined"
          sx={{
            backgroundColor: "#f8fcfa",
            borderColor: "#cfe0d8",
            boxSizing: "border-box",
            left: 0,
            marginTop: 1,
            maxHeight: 280,
            overflowY: "auto",
            position: "absolute",
            right: 0,
            textAlign: "left",
            zIndex: 10,
          }}
        >
          {loading && (
            <Typography sx={{ color: "#4a5f58", p: 1.5 }}>
              Searching...
            </Typography>
          )}
          {!loading && searched && results.length === 0 && (
            <Typography sx={{ color: "#4a5f58", p: 1.5 }}>
              No patients found.
            </Typography>
          )}
          {!loading && results.map((patient) => (
            <Button
              key={patient.id}
              type="button"
              onClick={() => handleSelect(patient)}
              sx={{
                borderRadius: 0,
                color: "#153f37",
                display: "block",
                justifyContent: "flex-start",
                px: 1.5,
                py: 1.25,
                textAlign: "left",
                textTransform: "none",
                width: "100%",
                "&:hover": {
                  backgroundColor: "rgba(21, 63, 55, 0.08)",
                },
              }}
            >
              <Box>
                <Typography sx={{ color: "#153f37", fontWeight: 700 }}>
                  {patient.first_name} {patient.last_name}
                </Typography>
                <Typography sx={{ color: "#5a7a71", fontSize: 13 }}>
                  {patient.date_of_birth ? `DOB ${patient.date_of_birth}` : "Date of birth not recorded"}
                </Typography>
              </Box>
            </Button>
          ))}
        </Paper>
      )}
    </Box>
  );
}
