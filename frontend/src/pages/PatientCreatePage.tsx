import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
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
  const userDisplayName =
    `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.username;

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
      <Stack spacing={3} sx={{ textAlign: "left" }}>
        <Button component={RouterLink} to="/patients" size="small" sx={{ alignSelf: "flex-start" }}>
          Back to patients
        </Button>
        <Paper
          variant="outlined"
          sx={{
            background:
              "linear-gradient(135deg, rgba(21,63,55,1) 0%, rgba(31,97,86,1) 52%, rgba(88,140,128,1) 100%)",
            borderColor: "#2f6d5c",
            color: "#f6fff8",
            overflow: "hidden",
            p: { xs: 2.5, md: 3 },
            position: "relative",
          }}
        >
          <Box
            sx={{
              background:
                "radial-gradient(circle at top right, rgba(255,255,255,0.16), transparent 42%)",
              inset: 0,
              position: "absolute",
            }}
          />
          <Stack spacing={1.5} sx={{ position: "relative" }}>
            <Chip
              label="Add Patient"
              sx={{
                alignSelf: "flex-start",
                backgroundColor: "rgba(255,255,255,0.14)",
                color: "#f6fff8",
                fontWeight: 700,
              }}
            />
            <Typography component="h2" variant="h4" sx={{ color: "#ffffff", fontWeight: 700 }}>
              Patient creation is limited to doctor accounts
            </Typography>
            <Typography sx={{ color: "#d8f1e8", maxWidth: 560 }}>
              {userDisplayName} is signed in without doctor access, so this page stays read-only.
            </Typography>
          </Stack>
        </Paper>
      </Stack>
    );
  }

  return (
    <Stack spacing={3} sx={{ textAlign: "left" }}>
      <Button component={RouterLink} to="/patients" size="small" sx={{ alignSelf: "flex-start" }}>
        Back to patients
      </Button>

      <Paper
        variant="outlined"
        sx={{
          background:
            "linear-gradient(135deg, rgba(21,63,55,1) 0%, rgba(31,97,86,1) 52%, rgba(88,140,128,1) 100%)",
          borderColor: "#2f6d5c",
          color: "#f6fff8",
          overflow: "hidden",
          p: { xs: 2.5, md: 3 },
          position: "relative",
        }}
      >
        <Box
          sx={{
            background:
              "radial-gradient(circle at top right, rgba(255,255,255,0.16), transparent 42%)",
            inset: 0,
            position: "absolute",
          }}
        />
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          sx={{ justifyContent: "space-between", position: "relative" }}
        >
          <Box sx={{ maxWidth: 640 }}>
            <Chip
              label="New Patient Record"
              sx={{
                backgroundColor: "rgba(255,255,255,0.14)",
                color: "#f6fff8",
                fontWeight: 700,
                mb: 1.5,
              }}
            />
            <Typography component="h2" variant="h4" sx={{ color: "#ffffff", fontWeight: 700 }}>
              Create a patient chart
            </Typography>
            <Typography sx={{ color: "#d8f1e8", maxWidth: 560, mt: 1 }}>
              Add core demographic details now, then continue into the chart to manage visits,
              medications, allergies, and vitals.
            </Typography>
          </Box>

          <Paper
            elevation={0}
            sx={{
              alignSelf: "flex-start",
              backgroundColor: "rgba(7, 28, 24, 0.24)",
              border: "1px solid rgba(216, 241, 232, 0.18)",
              color: "#ffffff",
              minWidth: 180,
              px: 2,
              py: 1.5,
            }}
          >
            <Typography variant="caption" sx={{ color: "#bde3d7" }}>
              Signed In
            </Typography>
            <Typography sx={{ color: "#ffffff", fontWeight: 700 }}>
              {userDisplayName}
            </Typography>
          </Paper>
        </Stack>
      </Paper>

      {error && (
        <Paper
          variant="outlined"
          sx={{ backgroundColor: "#fff4f4", borderColor: "#e6b3b3", color: "#7a1f1f", p: 2 }}
        >
          <Typography>{error}</Typography>
        </Paper>
      )}

      <Card
        variant="outlined"
        sx={{
          backgroundColor: "#242824",
          borderColor: "#3a453b",
          color: "#f4f7f1",
        }}
      >
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h5" sx={{ color: "#f4f7f1", fontWeight: 700 }}>
                Patient details
              </Typography>
              <Typography sx={{ color: "#c4ccbe", mt: 0.5 }}>
                First and last name are required. The remaining fields can be filled in now or later.
              </Typography>
            </Box>

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                <Box
                  sx={{
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                  }}
                >
                  <TextField
                    fullWidth
                    label="First name"
                    required
                    value={form.first_name}
                    onChange={(event) => setForm({ ...form, first_name: event.target.value })}
                    sx={{ "& .MuiOutlinedInput-root": { backgroundColor: "#f8fcfa" } }}
                  />
                  <TextField
                    fullWidth
                    label="Last name"
                    required
                    value={form.last_name}
                    onChange={(event) => setForm({ ...form, last_name: event.target.value })}
                    sx={{ "& .MuiOutlinedInput-root": { backgroundColor: "#f8fcfa" } }}
                  />
                  <TextField
                    fullWidth
                    label="Date of birth"
                    type="date"
                    value={form.date_of_birth || ""}
                    onChange={(event) => setForm({ ...form, date_of_birth: event.target.value })}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={{ "& .MuiOutlinedInput-root": { backgroundColor: "#f8fcfa" } }}
                  />
                  <TextField
                    fullWidth
                    label="Phone number"
                    value={form.phone || ""}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    sx={{ "& .MuiOutlinedInput-root": { backgroundColor: "#f8fcfa" } }}
                  />
                  <TextField
                    fullWidth
                    label="Primary language"
                    value={form.primary_language || ""}
                    onChange={(event) =>
                      setForm({ ...form, primary_language: event.target.value })
                    }
                    sx={{
                      gridColumn: { xs: "span 1", md: "1 / -1" },
                      "& .MuiOutlinedInput-root": { backgroundColor: "#f8fcfa" },
                    }}
                  />
                </Box>

                <Button
                  type="submit"
                  disabled={submitting}
                  variant="contained"
                  sx={{
                    alignSelf: { xs: "stretch", sm: "flex-start" },
                    backgroundColor: "#9bd18f",
                    color: "#122017",
                    fontWeight: 700,
                    minWidth: 180,
                    "&:hover": {
                      backgroundColor: "#b3e3a8",
                    },
                  }}
                >
                  {submitting ? "Creating..." : "Create Patient"}
                </Button>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
